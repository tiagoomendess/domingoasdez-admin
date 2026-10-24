# Jobs phase 1: no images, no social media

Port plans for the 8 legacy jobs that only touch the database, R2 and email. Runtime, switches
and the cutover steps are in [jobs.md](jobs.md). `process-polls` is left for the image phase:
publishing scheduled polls is DB only, but it is the same legacy class as the poll image, and a
legacy job is switched off as a whole.

| #   | Job                            | Cron (UTC)     | Touches                                    | New pieces        |
| --- | ------------------------------ | -------------- | ------------------------------------------ | ----------------- |
| 1   | `delete-not-verified-accounts` | `*/10 * * * *` | `users`                                    | —                 |
| 2   | `process-uuid-karma`           | `15 2 * * *`   | `uuid_karmas`                              | game score helper |
| 3   | `process-game-comments`        | `15 1 * * *`   | `game_comments`, `articles`                | —                 |
| 4   | `cleanup-tmp-folder`           | `0 4 * * *`    | R2 `storage/tmp/`                          | `listFiles()`     |
| 5   | `generate-game-comments`       | `* * * * *`    | `game_comments`, mail                      | mailer            |
| 6   | `process-score-report-bans`    | `59 22 * * *`  | `score_report_bans`, `uuid_karmas`, mail   | —                 |
| 7   | `process-delete-requests`      | `0 1 * * *`    | users, profiles, permissions, comments, R2 | —                 |
| 8   | `score-report-consumer`        | `* * * * *`    | `games`                                    | shadow mode       |

Each job is one change (code, tests, docs), then a cutover of its own: comment the job out in the
legacy `Kernel`, then add it to `WORKER_JOBS`.

## Shape of a job

```
src/worker/jobs/<name>.ts        run(context): queries, writes, logging
src/worker/jobs/<name>.rules.ts  pure decisions (what to ban, karma deltas, article text, …)
src/worker/jobs/<name>.spec.ts   unit tests of the rules, no database
```

The job is then wired into the registry (`run` from `./<name>.ts`). Rules take plain rows and
return plain values, so tests feed them fixtures (`now` and random numbers are injected). Queries
reuse the admin's schema and helpers; anything that calls `audit()` or `getRequestEvent()`
can't be imported (the worker build refuses `$app/server`), so a shared helper that needs both
is split into a pure part and a request part.

**Legacy bugs** follow docs/architecture.md: crashes and things that can only be mistakes are
fixed and listed under "Fixes"; behaviour that could be intended is listed under "Questions",
and the legacy behaviour is kept until it's answered.

**Local checks** use the shared `dad_db` (AGENTS.md rules): set up the case with temporary SQL,
run `npm run worker -- run <job>`, check the result, then restore the rows. The local legacy
container (`domingoasdez-app-1`) only runs Apache, no scheduler, so nothing else processes the
test rows.

**Comparing with legacy** (done for jobs 4–7): set up the case, run the legacy job once in its
container, snapshot the result, reset the case, run the worker job, diff the snapshots, restore.
The legacy job runs through tinker with overrides that keep it local:

```bash
echo '(new App\Jobs\<Job>)->handle();' | docker exec -i \
  -e MAIL_DRIVER=log \
  -e R2_ENDPOINT=http://host.docker.internal:4566 -e R2_USE_PATH_STYLE_ENDPOINT=true \
  -e R2_ACCESS_KEY_ID=test -e R2_SECRET_ACCESS_KEY=test -e R2_BUCKET=domingoasdez-dev \
  domingoasdez-app-1 php artisan tinker
```

`MAIL_DRIVER=log` writes the mail to `storage/logs/laravel.log` (the `email_outbox` row is still
written) instead of sending it; the legacy `.env` points R2 at the Cloudflare dev bucket, so the
R2 overrides are needed for LocalStack. Real env vars win over `.env` (no config cache). For the
worker side, mail went to a throw-away local SMTP listener (`MAIL_HOST=127.0.0.1`, any port it
listens on, `WORKER_DRY_RUN=false`) and test recipients were `@example.test` addresses. Time
shifts (jobs that compare file or row ages) use `Carbon::setTestNow()` in tinker and a preloaded
`Date` override for node (`node --import <file> …`); LocalStack doesn't check request times.

## Shared groundwork

### Game score (jobs 2, 6, 8)

Legacy `Game::getHomeScore()`: `goals_home`, or the number of `goals` rows of the home team when
it's null (same for away). **Done:** `#lib/server/games/score.ts`, a pure
`gameScore(game, counts)` plus `goalCounts(games)` (one query, `goals` grouped by game and team,
only for games without a typed score); `/today` uses it instead of its inline copy.

### Mailer (jobs 5, 6, 7) — `src/worker/mail/`

Mail goes through the site's own SMTP server, as `domingoasdez-app` already does for account
emails (`src/lib/server/mail.ts` there: verification and password-changed mails). Mailgun is no
longer used. **Done** (`src/worker/mail/index.ts`, `messages.ts`), a port of that module:

- **Transport:** `nodemailer` `~10.0.14` (the app's version; 10.1 and 10.2 were days old) with
  `@types/nodemailer`, one
  cached SMTP transporter built from the app's settings: `MAIL_DRIVER` (only `smtp`),
  `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION` (`ssl` or port
  465 → implicit TLS; `tls` → STARTTLS required), `MAIL_FROM_ADDRESS` (`geral@domingoasdez.com`),
  `MAIL_FROM_NAME` (`Domingo às Dez`). Same keys and parsing as the app's `src/env.ts`, added to
  this `src/env.ts` and `.env.example`, so production copies the app's values. Locally they stay
  empty and the jobs run in dry run.
- **`sendMail(mail, { dryRun, log })`** sends a built `{ to, subject, text, html }` from
  `MAIL_FROM_*`; errors throw, and each job decides whether a failed mail stops its item (none of
  them does: the failure is logged and the item goes on).
- **Builders, no I/O:** one per mail, returning that message, like the app's
  `buildVerificationEmail()`: `buildGameCommentEmail()`, `buildScoreReportBanEmail()`,
  `buildAccountDeletedEmail()`. Same simple inline-styled HTML as the app's mails, plus a plain
  text version; values HTML-escaped. The game comment mail keeps the content of
  `resources/views/emails/game_comment.blade.php`; the ban and account-deleted mails keep the
  legacy notification lines (greeting, lines, `geral@domingoasdez.com` contact).
- **Texts:** the legacy Portuguese strings (`resources/lang/pt/emails.php`) as Paraglide messages
  (both message files, like all text), rendered with `locale: 'pt-PT'`.
- **Outbox:** every mail also inserts an `email_outbox` row in the legacy `EmailOutboxProvider`
  format (`from` / `to` as JSON objects `{"address": "name"}`, `cc` / `bcc` the text `null`,
  `headers`, `attachments: []`), written before sending like legacy (which logged on
  `MessageSending`, so failed sends have a row too). The JSON isn't PHP-escaped (`à`, not
  `à`), like the admin's audit rows.
- **Dry run** (`WORKER_DRY_RUN`): logs recipient and subject; no SMTP connection, no outbox row.
- **Links** use `PUBLIC_FRONTEND_URL`: `https://domingoasdez.com`, where the new public app now
  runs (it serves `/flash-interview/…`); `app.domingoasdez.com` only redirects there.
- **Layout:** the app's simple inline-styled page. Legacy's Laravel notification layout also had
  a site-name header and a "© 2026 Domingo às Dez. All rights reserved." footer; those are gone,
  the texts are the same.
- **Tests** (`mail.spec.ts`, `messages.spec.ts`): transport options per `MAIL_ENCRYPTION` / port,
  outbox row format, outbox written before sending, dry run, the three builders (subjects,
  escaping, links, dates in Lisbon time).

The public app doesn't log its mails in `email_outbox` and nothing reads the table; decided
(2026-10-23): the worker keeps writing it for the jobs' mails, like legacy.

### Storage (job 4, 7)

**Done:** `listFiles(folderUrl)` in `#lib/server/storage`: `ListObjectsV2` with `Delimiter: '/'`
(direct children only, like Laravel's `files()`), paginated, returning `{ url, lastModified }`
(`list.spec.ts`, mocked client). `deleteFile()` already existed.

## 1. `delete-not-verified-accounts` (every 10 min)

**Legacy.** `users` with an email, `verified = 0` and `created_at` older than 15 minutes get
`name`, `email`, `password`, `email_token`, `remember_token` set to null (one `UPDATE`).

**Port.** The same single update. Drizzle's `timestamps` also set `updated_at` (the legacy query
builder didn't); harmless, and it records when the account was blanked. Log the count at info
when it's above zero.

**Tests.** The cutoff (15 min before `now`).

**Local check.** Insert an unverified user created 20 minutes ago and one 5 minutes ago; only the
first is blanked. Delete both.

**Status.** Ported (`src/worker/jobs/delete-not-verified-accounts.ts`), checked locally
2026-10-23 as above. Not cut over.

## 2. `process-uuid-karma` (02:15)

**Legacy.** Over score reports created in the last 24 h, three passes on `uuid_karmas`:

1. Finished reports (`finished = 1`) whose score equals the game's score: +3 (a new row starts
   at 3).
2. Unfinished reports marked correct (`finished = 0`, `is_correct = 1`): +1.
3. Reports marked fake (`is_fake = 1`): −1.

A uuid with several reports gets each report's points.

**Port.** One query for the reports with their game scores; rules
`karmaDeltas(reports) → Map<uuid, delta>`; then per uuid
`INSERT … ON DUPLICATE KEY UPDATE karma = karma + ?` (same result as the legacy sequence of
`addKarma()` calls, without the read-then-write race), all in one transaction: a failure leaves
the night's karma untouched instead of half applied.

**Fixes.**

- Pass 1 doesn't skip reports without a uuid (passes 2 and 3 do): creating a karma row with a
  null key throws, and since the three passes share one `try`, a single report like that skips
  the rest of the night's karma. The port skips them in every pass.
- Same crash for uuids longer than 36 characters (`score_reports.uuid` takes 40,
  `uuid_karmas.uuid` 36): skipped too.

**Tests.** Each pass, a uuid in several passes, missing uuid, score from goals when `goals_home`
is null.

**Local check.** Pick (or insert) recent reports for a finished game, note the uuids' karma, run,
compare, restore.

**Status.** Ported (`process-uuid-karma.ts` + `.rules.ts`), checked locally 2026-10-23: a new
device with a right final report and a correct one got 4, a device at 5 with a fake report got 4;
the report without a uuid and the one older than 24 h were ignored. Not cut over.

## 3. `process-game-comments` (01:15)

**Legacy.** Flash interviews (`game_comments`) unused and past their deadline, grouped by game
group. For each group: one hidden draft article (`visible = 0`, `user_id = 2`, today's date,
tags `<group>, <competition>, crónica`, cover = a random `media` whose tags contain the home
club's name) titled `<group> da <competition> de <weekday>`, with one section per game: score
(with penalties), a random intro sentence (5 templates, 8 endings, venue, day, month, goals,
outcome) and each team's comment or "não enviou um comentário". The comments are marked used.

**Port.** Rules `buildArticle(games, comments, random)` return title, HTML, tags; the job loads
the data, inserts the article and marks the comments used in one transaction (no half-processed
group if it fails). Weekday and month names from `Intl.DateTimeFormat('pt-PT')` in Lisbon time
(`domingo`, `outubro`: the same words as Carbon's `pt_BR`).

**Fixes.**

- The comment of a team is looked up by team only, not by game: when a team has two pending
  comments (e.g. the job failed one night), its section may show the other game's comment. The
  port matches game and team.
- Comments and club names go into the article HTML unescaped. Legacy strips tags on save, but
  `&` and `<` still break the markup; the port escapes them, and the result goes through
  `storedHtml()` like any article body.
- Dates were read as UTC (a 23:30 game in summer showed the next day); the port uses Lisbon time.
- The score came from `goals_home` / `goals_away` only, so a game scored through its goals showed
  `0-0` (while the outcome sentence, which used the goals, named a winner); the port uses
  `gameScore()` for both.
- Only the comments it matched were marked used: any other pending comment of the group's games
  (a duplicate, or a team that is no longer in the game) stayed pending and brought its game
  back in a new draft every night. The port marks every pending comment of the group's games
  used; with two comments for one team, the first with text is shown.
- Titles longer than `articles.title` (155) failed the insert; they're cut.

Line breaks in comments are kept (`<br/>`); legacy put the raw text in the paragraph, where
they showed as spaces.

**Tests.** Article text for a win, draw and penalties, missing comments, two games per group,
two pending comments of one team, escaping.

**Local check.** Move the deadline of a few pending comments to the past (note the values), run,
look at the draft article in `/articles`, then delete it and restore the comments.

**Status.** Ported (`process-game-comments.ts` + `.rules.ts`), checked locally 2026-10-23: the six
comments of three games from 18 October (two game groups) were set back to unused; the run made
two hidden drafts with the expected sections and cover and marked the comments used; drafts
deleted and comments restored (`used`, `updated_at`). Not cut over.

## 4. `cleanup-tmp-folder` (04:00)

**Legacy.** Deletes files directly under `/storage/tmp` older than 3 days (except `.gitkeep`).
These are the social media images; posts publish the same day.

**Port.** `listFiles('/storage/tmp/')`, `deleteFile()` for each one older than 3 days, counts
logged. Stops between files when the signal aborts.

**Tests.** The age rule and `.gitkeep` (`cleanup-tmp-folder.spec.ts`), `listFiles()` paging and
prefixes (`list.spec.ts`).

**Status.** Ported, compared with legacy 2026-10-23 on LocalStack: the six real tmp files backed
up; set A (two test files, a `.gitkeep`, a file in a subfolder) uploaded, time T noted, set B
(one file) uploaded; each job run as if at T + 3 days. Both deleted the same 8 files (the six
real ones and set A's two), kept set B, left `.gitkeep` and the subfolder alone. Log counts match
legacy (`.gitkeep` not counted). Test files deleted, real files restored from the backup (their
upload date is now 23 October; a LocalStack restart resets it anyway). Not cut over.

## 5. `generate-game-comments` (every minute)

**Legacy.** Visible, finished, not postponed games of the last 2 days with no flash interviews
yet (10 per run). For each one, a `game_comments` row per team (new uuid, 4-digit PIN, deadline
the end of tomorrow in Lisbon) and, when the club has `notifications_enabled`, an email to the
team's `contact_email`, else the club's, else the club admin's (see fixes): subject
`Por favor comente o jogo <home> vs <away>`,
link to `/flash-interview/<uuid>?pin=<pin>`, unsubscribe link
`/flash-interview/<uuid>/manage-notifications?pin=<pin>`, deadline in Lisbon time.

**Port.** Both comments of a game inserted in one transaction, mails sent after the commit (a
failed mail is logged, the comments stay, as in legacy). PIN from `crypto.randomInt`. Dry run
still creates the comments (they're data, not a message) and logs the mails.

**Fixes.**

- The 2-day window compares Lisbon local times with the UTC `date` column (off by an hour in
  summer); the port uses UTC instants.
- A crash between the home and the away comment left the game with one comment, and the
  `doesntHave` check never created the other: the transaction prevents it.
- The third fallback, the club admin's email (`clubs.admin_user_id` → `users.email`), never
  worked in legacy (`$club->admin_user` is not the `adminUser` relation, so it was always empty).
  Decided (2026-10-23): fixed, club admins get the mail when neither the team nor the club has a
  contact email. This is new mail to people who never got it, so mention it to the club admins
  at the cutover.

**Tests.** Recipient choice (team, club, club admin, none), PIN digits, links
(`generate-game-comments.spec.ts`); end of tomorrow in Lisbon across the October DST change and a
month end (`time.spec.ts`); the email (`messages.spec.ts`).

**Status.** Ported, compared with legacy 2026-10-23: game 9552 (Oliveira vs Macieira, no flash
interviews) moved to yesterday; the home team got a test address; the away side had no team or
club email and a test club admin. Legacy: two comments (deadline 2026-10-24 22:59:59 UTC), one
mail (home), "No notification email found for team 15" for the away side (the fallback bug).
Worker: the same two comments (same deadline, empty content, no user), the same home mail and
outbox row, plus the club admin's mail (the fix). The mail text matches paragraph by paragraph;
links use `PUBLIC_FRONTEND_URL` where legacy used `APP_URL`. Also checked: an SMTP failure is
logged and the comments stay; a club with notifications off gets no mail. Data restored (game,
team, club, test user). Not cut over.

## 6. `process-score-report-bans` (22:59)

**Legacy.** Website reports (`source = 'website'`) updated in the last 24 h, on finished,
not postponed games. A report is fake when it was flagged `is_fake` or its home or away score is
above the game's final score. Each fake report's sender (user, or the last user seen on its
uuid; IP; uuid) is banned for 15 days with the reason `Envio de um resultado falso no jogo
<home> vs <away>`, once per run per sender; their karma becomes −1 (or drops by 3 more when
already negative), and a signed-in user gets the ban email (expiry date, reason).

**Port.** Rules `isFakeReport()`, `banTarget()` (legacy column limits), `banKey()` (per-run
de-duplication), `nextKarma()`; the job creates each ban and the karma change in one transaction
(reusing `lastKnownUserId()` and `findMatchingBan()` from the bans section), then emails the user.
The admin's `banFakeReporter()` (used by `/today` "mark fake") stays as it is: it audits and has
a different karma rule. Legacy's `score_report_id` on create is dropped by Eloquent (not
fillable, no such column), so the port doesn't set it either.

**Fixes.**

- The email shows the expiry in UTC, an hour behind Lisbon time in summer; the port formats it
  in Lisbon time.
- Legacy created a new ban even when an active ban already covered the sender (e.g. an admin
  marked the report fake on `/today` that afternoon, which bans right away), so they got a second
  ban, a second email and another −3 karma. Decided (2026-10-23): senders with an active matching
  ban (`findMatchingBan()`, as `/today` does) are skipped: no ban, no email, no karma change.

**Tests.** Fake by flag, by home or away score, equal and lower scores (not fake), target limits,
de-duplication key, reason, karma sequence (null → −1, 12 → −1, −1 → −4), device ids
(`process-score-report-bans.spec.ts`); the email (`messages.spec.ts`). The query-level cases are
in the legacy comparison below.

**Status.** Ported, compared with legacy 2026-10-23 on nine test reports on game 8711 (final
1-3): above the final score from a signed-in user, equal, lower, flagged fake, a second report
from the first sender, one from a device with an active ban (karma −1), one on an unfinished
game, one from the app (not website), and a signed-out device linked to a user in `user_uuids`.
Legacy: 4 bans, 2 mails, karma −1 / −1 / −4 / −1. Worker: the same bans, mails, outbox rows and
karma, except the already-banned device: no second ban and its karma stays −1 (the fix). The
mail text matches. All test rows removed. Not cut over.

## 7. `process-delete-requests` (01:00)

**Legacy.** Every unprocessed delete request: cancelled ones are only marked processed. For the
others: email "A sua conta foi eliminada", then blank `article_comments.content`, delete
`user_permissions`, clear the profile (phone, bio, picture file deleted, consents), blank the user
(name, email, password, tokens, `verified = 0`), delete `social_providers`, mark the request
processed.

**Port.** Unprocessed requests: cancelled ones are marked processed; confirmed ones
(`verified = 1`) are carried out; the rest are left pending. Per confirmed request: mail first
(the address is gone afterwards; a failed mail is logged and the deletion still happens), then
all DB changes in one transaction, then delete the picture file (`deleteFile()`, never throws).

**Fixes.**

- A request whose user or profile is missing crashes the legacy job and stops every request
  after it; the port skips what's missing and still processes the rest.
- Legacy also carried out requests that were never confirmed: the user asked, got the code by
  email, never entered it, and the account was deleted that night anyway (the local dump has one
  such request). Decided (2026-10-23): only confirmed requests are carried out. An unconfirmed one
  stays pending, so the user can still confirm it later (the legacy confirm page looks for a
  pending, unverified request) or cancel it.

**Tests.** Cancelled, confirmed and unconfirmed requests (`process-delete-requests.spec.ts`); the
email (`messages.spec.ts`). The table changes are in the legacy comparison below.

**Status.** Ported, compared with legacy 2026-10-23 with three test users: A (confirmed request,
profile with phone, bio, consents and an avatar in LocalStack, a permission, a comment, a social
login), B (cancelled request), C (unconfirmed request, profile and avatar). Legacy anonymised A
and C, emailed both, deleted both avatars, closed B. Worker: identical for A and B; C left
pending with its account, profile and avatar, no mail (the fix). The mail text matches. Also
checked: a confirmed request whose user has no profile (legacy would crash) and an SMTP failure:
the failure is logged and the account is still anonymised. All test rows and files removed. Not
cut over.

## 8. `score-report-consumer` (every minute)

**Legacy.** Live games: visible, not postponed, today (UTC day), from 30 min before kick-off to
3 h after. For each unfinished one, the non-fake reports of the last 7 minutes, grouped by
`home-away-finished`:

- each report scores 1, +1 with a location, +1 more when the accuracy is ≤ 400 m and it's
  1–150 m from the playground, +1 with a signed-in user, +4 from `api_afpb_crawler`;
- each score gets +1 when two sources agree, +2 for three or more;
- one score: applied when above 4 points; four or more competing scores: nothing; two or three:
  the best is applied when it has at least 4 points and half of it is ≥ the second and > the
  lowest.

Applying writes `goals_home`, `goals_away` and `finished` when they differ from the current
score, then clears the legacy live cache.

**Port.** A straight port in `score-report-consumer.rules.ts`: `reportPoints()` (with the
haversine `distanceMetres()`), `tallyScores()` (grouping and source bonus), `decideScore()`,
plus the live window (`utcDay()`, `isLive()`). The job (`score-report-consumer.ts`) loads the
live games and all their recent reports in two queries, and updates `goals_home`, `goals_away`,
`finished` when the decided score differs from the current one (`gameScore()`). Each decision is
logged at debug with the points per score, like legacy; an update is logged at info
(`updated #id Home vs Away from 0-0-false to 2-1-false (…)`). A failing game is logged and the
others go on.

**Fixes.** A game without a playground crashes on the distance check when a report has an
accurate location, and the whole game is skipped that minute; the port gives no distance point.

**Kept as is.** The 1 m lower bound of the distance (it may be there to ignore spoofed
coordinates), one report being enough (the comment says two), the UTC day for "today", the
accuracy read as a whole number with 0 counted as missing (PHP `0 != null`), so sub-metre
accuracies get no distance check.

**Shadow mode.** `SCORE_REPORT_CONSUMER_SHADOW=true` (in `src/env.ts`, default `false`): the job
logs `would update <game> from <score> to <score>` at info and writes nothing. Enable it in
production next to the legacy job for one match day (`WORKER_JOBS=score-report-consumer`), compare
the log with the scores the legacy job set (game `updated_at`, the legacy log), then cut over and
turn shadow off.

**Tests.** Hand-built cases for every branch: each point rule (location, accuracy limits,
distance in and out of range, missing playground, user, AFPB crawler), source bonuses, grouping
order, single score above / at 4, two and three competing scores, ties, four or more, and the
live window edges. Real Sunday data is the shadow-mode comparison.

**Status.** Ported, checked locally 2026-10-23: game 8711 moved to 20 minutes ago at 0-0 with
five test reports (a located website report ~50 m from the pitch, an AFPB crawler report, a
competing 1-1, a fake one, one older than 7 minutes). The scores came out as
`2-1-false(9) | 1-1-false(1)`; shadow mode logged "would update" and wrote nothing; the real run
set 2-1; a second run changed nothing. Reports deleted, game restored (date, score, `finished`,
`updated_at`). Not cut over: shadow match day first.

## Status and cutover

All 8 jobs are ported and checked (2026-10-23); none is cut over. Jobs 1–3 and 8 were checked on
local data, jobs 4–7 also against a run of the legacy job on the same data. For each job, after
deploying the admin: comment the job out in the legacy `Kernel` and deploy legacy, then add it
to `WORKER_JOBS` and reload the worker (`pm2 reload domingoasdez-admin-worker --update-env`).

- Mail jobs (5, 6, 7) need the `MAIL_*` settings (the app's values), `WORKER_DRY_RUN=false` and
  `PUBLIC_FRONTEND_URL=https://domingoasdez.com` in the admin's production `.env`.
- Job 5 starts emailing club admins of teams without contact emails (the fixed fallback).
- Job 8: a shadow match day first (`SCORE_REPORT_CONSUMER_SHADOW=true`), then cut over.
