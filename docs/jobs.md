# Background jobs (worker)

Plan for moving the legacy Laravel scheduler (`app/Console/Kernel.php`) and its jobs into this
repository. The runtime is in place (`src/worker/`, see "What exists") with every job registered
on its legacy schedule; `npm run worker -- list` shows which are ported. Progress of the first
phase: [jobs-phase-1.md](jobs-phase-1.md).

## Where the jobs live

**In this repository, as a separate process** (`domingoasdez-admin-worker` in PM2), built and
deployed together with the admin.

- **Not in `domingoasdez-app`.** The public app is the part exposed to traffic: it gets restarted
  and scaled for visitors, and it only mirrors the tables it reads. Jobs write to most of the
  schema, send mail and post to social media; they belong next to the schema owner.
- **Not in a new repository (for now).** The jobs need what the admin already has: the Drizzle
  schema and its migrations, R2 storage paths, the image optimiser, the `variables` settings, the
  legacy data rules. A third repository would have to copy or publish all of that, and a schema
  change would need coordinated releases of two repositories that could drift. If the worker
  ever needs its own release cadence, move `src/lib/server` and `src/worker` into workspace
  packages of one monorepo instead.
- **Not inside the web server process.** The worker runs from the same build but in its own
  process: a deploy or crash of the admin UI never interrupts a social post halfway, image
  generation (CPU, memory) never slows the admin down, and each has its own logs, memory limit
  and restart policy.

## Runtime

```
scripts/deploy.sh
  └─ npm run build ─┬─ vite build                                → build/        (admin, adapter-node)
                    └─ vite build --config vite.worker.config.ts → build/worker/ (worker bundle)
  └─ pm2 startOrReload ecosystem.config.cjs
        ├─ domingoasdez-admin         build/index.js         HTTP, checked with /healthz
        └─ domingoasdez-admin-worker  build/worker/index.js  scheduler, checked with .worker-heartbeat
```

- **Build.** `vite.worker.config.ts` bundles `src/worker/main.ts` (dependencies stay external,
  like the admin build). The admin's server modules read configuration from `$app/env/private`,
  which only exists inside SvelteKit; the worker build replaces it with a module that validates
  `process.env` against the same `src/env.ts` definitions, so both processes share one
  definition of every variable. Any other `$app/*` import (`getRequestEvent`, …) fails the
  worker build: code that needs a request cannot run in a job.
- **Scheduling.** [croner](https://github.com/hexagon/croner), one cron per job, in **UTC**
  (Laravel's `app.timezone` is UTC, so `dailyAt('05:15')` is 05:15 UTC: 06:15 in Lisbon in
  summer). Jobs that need Lisbon days compute them themselves, as the legacy code does.
- **Overlap.** Laravel started a new `schedule:run` every minute without `withoutOverlapping()`,
  so a slow run could overlap the next one. The worker skips a tick while the previous run of the
  same job is still going (`protect`), and every run holds a MySQL `GET_LOCK('dad:job:<name>')`,
  so two processes (a manual `run` during the scheduler, a PM2 reload) never run one job twice.
  Jobs due in the same minute run concurrently (Laravel ran them one after the other); none of
  the legacy jobs depends on another one's result within a minute.
- **Shutdown.** PM2 sends `SIGINT`; the worker stops scheduling, aborts the run's `signal`
  (jobs check it between items) and waits up to 50 s (`kill_timeout` is 60 s) before exiting.
- **Health.** After the database answers, the worker writes `.worker-heartbeat`
  (`{"pid":…,"at":…}`) and refreshes it every 30 s. The deploy waits for a heartbeat from the
  new PID, as it waits for `/healthz` from the admin.
- **Logs.** One line per event to stdout/stderr (`pm2 logs domingoasdez-admin-worker`), JSON in
  production for Grafana ([logging.md](logging.md)), with the job as `scope` and each run's
  `durationMs`. `WORKER_LOG_LEVEL=debug` for the legacy `Log::debug` detail.

### Switches

| Variable           | Default | Meaning                                                                                                                             |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `WORKER_JOBS`      | empty   | Jobs the worker schedules: comma-separated names, or `all`. Empty = nothing runs. Naming a job that is not ported stops the worker. |
| `WORKER_DRY_RUN`   | `true`  | Jobs log mail and social posts instead of sending them. Production sets `false`.                                                    |
| `WORKER_LOG_LEVEL` | `info`  | `debug`, `info`, `warn` or `error`.                                                                                                 |

Both defaults are the safe ones on purpose: locally the worker runs on the shared `dad_db`
(a production dump with real users' emails), next to the legacy jobs.

### Commands

```bash
npm run worker:build          # bundle the worker into build/worker
npm run worker -- list        # jobs, schedule, ported, enabled
npm run worker -- run <job>   # run one job now (same lock, dry run unless WORKER_DRY_RUN=false)
npm run worker                # start the scheduler (what PM2 runs)
```

`run` replaces running a job by hand with `php artisan tinker` on the legacy site.

## Jobs to port

Schedules are UTC, as in the legacy `Kernel`.

| Job (`WORKER_JOBS` name)       | Legacy class                | Cron (UTC)     | What it does                                                                                                           | Needs                               |
| ------------------------------ | --------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `publish-social-media`         | `PublishSocialMedia`        | `* * * * *`    | Prepares media containers 15 min ahead, publishes due `social_media_posts` (skips ones 5 min late)                     | Graph API (FB page, IG)             |
| `score-report-consumer`        | `ScoreReportConsumer`       | `* * * * *`    | Scores the last 7 min of reports per live game (location, user, source, AFPB crawler) and updates the score            | DB only (+ legacy cache, see below) |
| `generate-game-comments`       | `GenerateGameComments`      | `* * * * *`    | For finished games of the last 2 days without comments: one `game_comments` row per team (uuid + PIN), emails the team | Mail                                |
| `generate-game-image`          | `GenerateGameImage`         | `* * * * *`    | Games with `generate_image`: 1280×720 cover (playground background, emblems, competition), replaces `games.image`      | Images, R2                          |
| `process-polls`                | `ProcessPolls`              | `* * * * *`    | Makes scheduled polls visible; polls with `update_image`: 1280×720 question image                                      | Images, R2                          |
| `delete-not-verified-accounts` | `DeleteNotVerifiedAccounts` | `*/10 * * * *` | Blanks name/email/password of accounts not verified after 15 min                                                       | DB only                             |
| `process-delete-requests`      | `ProcessDeleteRequest`      | `0 1 * * *`    | Anonymises users with a confirmed delete request (profile picture deleted), emails them                                | Mail, R2                            |
| `process-game-comments`        | `ProcessGameComments`       | `15 1 * * *`   | Past-deadline flash interviews → one hidden draft article per game group                                               | DB only                             |
| `process-uuid-karma`           | `ProcessUuidKarma`          | `15 2 * * *`   | Karma for the last 24 h of score reports (+3 right final, +1 correct, −1 fake)                                         | DB only                             |
| `club-birthdays`               | `ClubBirthdays`             | `0 3 * * *`    | Clubs founded on this day: story (1080×1920) and post (1000×1250) images, scheduled posts                              | Images, R2 tmp                      |
| `cleanup-tmp-folder`           | `CleanupTmpFolder`          | `0 4 * * *`    | Deletes `/storage/tmp/` files older than N days                                                                        | R2 list                             |
| `player-goal-milestones`       | `PlayerGoalMilestones`      | `0 5 * * *`    | Players who reached a goal milestone in the last 24 h: story image (circular photo), scheduled posts                   | Images, R2 tmp                      |
| `schedule-social-media`        | `ScheduleSocialMedia`       | `15 5 * * *`   | Match day: the day's `social_media_posts` timeline (static images from `social_media.*` variables, match stories)      | Images, R2 tmp                      |
| `process-score-report-bans`    | `ProcessScoreReportBans`    | `59 22 * * *`  | Website reports above the final score (or flagged fake) → 15-day ban, karma, email                                     | Mail                                |

Not scheduled, not ported: the artisan commands `GptInfo`, `GptArticles`, `GptGames` (no longer
used), `UploadStorageToR2` and `PopulatePlayerTeamId` (one-off migrations, done).

## Shared pieces to build (as the jobs need them)

- **Images** (`src/worker/images/`, set up with `generate-game-image`). Intervention + GD
  became [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) `~1.0.10` (Skia, prebuilt
  binaries incl. linux-x64, no system packages; 1.0.11+ were under two weeks old) for drawing,
  plus `sharp` to decode sources (any format, EXIF rotation), blur and encode (progressive JPEG,
  quality 80, legacy `GENERATED_QUALITY`). One module per template (`game-cover.ts` so far; next
  `poll`, `match-story`, `match-square`, `club-birthday`, `goal-milestone`, `more-matches`)
  with a `render(input) → Uint8Array` that takes image bytes, so it's tested without the database.
  - `draw.ts` reproduces the GD calls: `insert(…, 'center')` (natural size, centred, cropped),
    `resize(w, null)` (upscales too), `blur(n)` as n passes of GD's 3×3 kernel (a single
    Gaussian of the same strength came out ~7 levels brighter), font sizes as GD points
    (`ceil(size × 0.75)`) at 96 DPI, text centred on its ink box like Intervention's
    `align/valign center`, transparent areas flattened onto white.
  - Assets (`src/worker/assets/`, see its README; copied to `build/worker/assets` by the worker
    build): Roboto Regular / Black, the game cover overlays, the 16:9 and 1:1 placeholders, the
    default emblem. Later templates add theirs (`poll_default.png`, `social_media_poster/*.png`).
  - Sources (`sources.ts`): `/storage/...` from R2 (`readFile()` in `#lib/server/storage`),
    `/images/...` from the assets, else from the legacy origin (`mediaUrl()`); `http(s)` URLs
    are downloaded.
  - Output goes through `storeFile()` (`/storage/game_images`, `/storage/poll_images`) or
    `putFile()` under `/storage/tmp/` (short cache) for social media. A replaced cover is deleted
    only when no other row uses it, as the legacy jobs do.
  - Text is up to ~1.6 % narrower than GD's (FreeType's hinted whole-pixel advances); same
    centre and height. Accepted: the main elements must be in the same place, not pixel-identical.
- **Mail** (`src/worker/mail/`). The site's own SMTP server through `nodemailer`, ported from
  `domingoasdez-app`'s `src/lib/server/mail.ts` (same `MAIL_*` settings); Mailgun is no longer
  used. Message builders per mail, texts in Paraglide messages rendered in `pt-PT` (the legacy
  `trans()` strings). Dry run logs the recipient and subject instead of sending. Details:
  [jobs-phase-1.md](jobs-phase-1.md), "Mailer".
- **Social media** (`src/worker/social/graph.ts`, done). `createSocialPoster()` ports
  `SocialPoster` on the Graph API with `fetch`: the same endpoints and parameters for Facebook
  page stories (photo and video, two phases), text and photo posts, photo upload and comments
  (the legacy backoffice's "post article", used by the admin's `#lib/server/articles/facebook.ts`,
  which never comments: the page lacks the permission, the link is commented by hand), and Instagram containers (image, reel, story photo and
  video) published after waiting for them to be processed. Settings: `FB_PAGE_ID`,
  `FB_PAGE_ACCESS_TOKEN`, `FB_SYSTEM_USER_TOKEN`, `IG_USER_ID`, `FB_GRAPH_VERSION` (legacy
  hard-coded `v24.0`), in `src/env.ts`. Tested against a fake Graph API (`graph.spec.ts`: every
  call's URL and form fields); never called for real from a test. Fix: a container in `ERROR` stops
  the wait (legacy's own `catch` retried it 5 times). Media URLs must be public: `mediaUrl()` with
  the CDN on. Dry run (in `publish-social-media`) marks nothing as published.
- **Storage.** `listFiles(folder)` with `LastModified` (done, for the cleanup); `readFile(url)`
  for image sources (to add).
- **Environment.** New variables go in `src/env.ts` (shared with the admin, validated in both
  processes) and `.env.example`.
- **Audit.** The legacy jobs write no audit rows; the ports don't either. `audit()` needs a
  request, which is why the worker build refuses `$app/server`.
- **Legacy file cache.** `ScoreReportConsumer` clears the legacy site's `live_matches` cache.
  The worker cannot reach it, so while the legacy site still serves pages, its live results may
  lag until the cache expires: 30 s (Laravel 5.8 cache TTLs are seconds). The public app reads
  the database and is not affected.

## Cutover, one job at a time

A job must run in exactly one place. For each job:

1. Port it with unit tests (pure logic separated from queries, like `form.ts` in the sections).
2. Run it locally with `npm run worker -- run <job>` (dry run) and compare with the legacy run on
   the same data.
3. Deploy the admin with the port (it is not enabled yet).
4. At a moment away from its schedule: remove (comment) the job from the legacy `Kernel` and
   deploy the legacy site, then add the job to `WORKER_JOBS` and
   `pm2 reload domingoasdez-admin-worker --update-env`.
5. When `Kernel::schedule()` is empty, remove the legacy crontab entry
   (`* * * * * php artisan schedule:run`).

Order:

1. **Phase 1, no images or social media** — the 8 jobs in [jobs-phase-1.md](jobs-phase-1.md):
   all ported and checked (2026-10-23), none cut over yet; `score-report-consumer` gets a shadow
   match day first.
2. Images: `generate-game-image` and `process-polls` ported and compared with legacy images
   (2026-10-23, status below).
3. Social media: the Graph API client, `schedule-social-media`, `club-birthdays` and
   `player-goal-milestones` ported and compared with legacy (2026-10-23), `publish-social-media`
   last (2026-10-24, it posts what the others schedule); status below.

All 14 jobs are ported; none is cut over yet. Cut `publish-social-media` over last, or together
with the jobs that schedule posts: either side publishes what is in the table.

## `generate-game-image`

**Ported** (`generate-game-image.ts` + `.rules.ts`, `images/game-cover.ts`), same sources as
legacy (`coverSources()`): the playground's picture, or the 1:1 placeholder of the playground's
id when it has none (legacy's `16_9`→`1_1` swap, which leaves white bands left and right), or
the game's 16:9 placeholder without a playground; club emblems or the default emblem; the
season's name and logo, else the competition's. The new file replaces `games.image`, the flag is
cleared, and the old file is deleted when no other game uses it. A failing game keeps its flag and
is retried next minute, as in legacy.

**Fix.** A season and competition without a logo crashed the legacy job for that game (it tried to
open `public/` as an image), so the game was retried, failing, every minute; the port draws no
logo.

**Compared with legacy** (2026-10-23, LocalStack, legacy run in its container): game 8716 (photo
background, season logo) and game 8685 (playground without picture → 1:1 placeholder, competition
logo, set postponed for the test). Emblems, logo, overlays and background in the same place;
title and names on the same centre and line, up to 12 px narrower on a 750 px title; mean pixel
difference 4.7 and 3.4 out of 255 (mostly JPEG noise). The old covers were deleted by both. Data
and files restored. Not cut over.

## `process-polls`

**Ported** (`process-polls.ts`, `images/poll.ts`, `images/wordwrap.ts`). Two steps, as legacy:

1. Hidden polls whose `publish_after` has passed and `close_after` hasn't become visible. Like
   legacy's query-builder update, `updated_at` is left as it is.
2. Polls flagged `update_image` (10 per run) get a new 1280×720 image: the question in white
   Roboto over `poll_default.png`, wrapped like PHP `wordwrap($question, 36)` (`phpWordwrap()`,
   which counts UTF-8 bytes, so accented questions wrap a little earlier, exactly as before), lines
   70 px apart around y = 480. The new file replaces `polls.image`, the flag is cleared, and the
   old file is deleted when no other poll uses it. A failing poll keeps its flag.

**Compared with legacy** (2026-10-23): `phpWordwrap()` against PHP 7.4 in the legacy container on
seven strings (accents, curly quotes, a double space, a word longer than the width, an existing
line break, leading and trailing spaces): identical. Then both jobs on the same data: polls 54
(accents, 2 lines), 53 (curly quotes and a double space, 2 lines) and 51 (one line) redrawn;
poll 49 hidden with `close_after` tomorrow (published by both, `updated_at` unchanged), poll 50
hidden and closed (left hidden by both). Same line breaks; line centres within 1 px, widths within
0.5 %, heights within 1 px; mean pixel difference 1.6–2.5 out of 255. Old images deleted by both.
Data and files restored. Not cut over.

## `schedule-social-media`

**Ported** (`schedule-social-media.ts` + `.rules.ts`, `images/match-story.ts`,
`images/more-matches.ts`). `dayTimeline()` builds the match day's posts in the legacy order (posts
with the same time publish by id): the 07:00 Lisbon story and post, the game stories from 07:01
(10 minutes apart; with more than 5 games, 5 random ones a minute apart and a story with the
number of the others), and the posts around the first kick-off up to the standings posts 3 h
after it. The job draws the game stories (1080×1920: background scaled to the height and blurred,
competition, emblems, names, then the date and playground or the final score) and the "more
games" story into `/storage/tmp/` under legacy's names, then inserts every row in one
transaction. Texts link to `PUBLIC_FRONTEND_URL` (`/jogos`, and `/competicoes/<season>/<name>`
for the standings, built with the admin's slug rules); the static images are the
`social_media.*` settings, served by the public app (`static/social_media_poster/`).

**Kept as legacy:** the first game whose story fails stops the remaining promotions. **Fixes:** a
missing `social_media.*` setting leaves its posts out (legacy crashed on the missing key);
standings posts only for visible competitions, as legacy.

**Compared with legacy** (2026-10-23): scenario A, three games moved to later today (one of them
finished, for the final-score story): the same 33 posts, row by row (platform, type, image, text,
time, order); the only difference is the standings link's host (legacy's local `APP_URL`). The
three stories: same layout, mean pixel difference 2.0–4.2 out of 255. Scenario B, seven games:
the same 39-post structure (5 random games a minute apart, the "more games" story at 07:06 with
"2"), the same file names; "more games" image difference 1.8. GD counts a leading space and the
whole width of a trailing one in its text box (legacy draws `" 2 "`), which `drawCenteredText()`
now reproduces. Games, posts and `/storage/tmp` restored. Not cut over.

## `club-birthdays` and `player-goal-milestones`

**Ported** (`club-birthdays.ts`, `player-goal-milestones.ts` + `.rules.ts`,
`images/club-birthday.ts`, `images/goal-milestone.ts`, shared `social/posts.ts`).

- `club-birthdays` (03:00 UTC): clubs with `birthday_post_enabled` founded on today's day and
  month get a 1080×1920 story (07:00 Lisbon) and a 1000×1250 post (07:05) on Facebook and
  Instagram: name, emblem (cropped to a square) and age over the club's first playground's
  picture, under `birthday_story.png` / `birthday_post.png`, caption "Parabéns … Hoje celebram N
  anos de história!".
- `player-goal-milestones` (05:00 UTC): players who scored in the last 24 h, whose total is at
  or up to 3 past a milestone (50, 75, 100, 125, 150, 200, 250, 300), get a 1080×1920 story and a
  1080×1350 post at 19:00 Lisbon: round photo (the default picture under 18, as legacy outside a
  request), first and last name, the milestone, "GOLOS", the club's emblem top right, over the
  club's first playground (or a placeholder). Once per milestone (`idempotency_records`,
  recorded even when an image failed, as legacy).
- New drawing helpers reproduce GD's `fit()` (crop to cover, then resize), the circle mask and
  the flood fill below.

**Kept as legacy** (decided 2026-10-23). Legacy's birthday post meant to darken the picture by
33 % (`fill('#000000', 0, 0, opacity 0.33)`), but GD's `fill()` with a position is a flood fill
and ignores the opacity: it turns black only the area of the top-left pixel's exact colour (a few
pixels on a photo), and the whole background when the club has no playground. The port draws the
same (`floodFill()`), not the intended overlay.

**Compared with legacy** (2026-10-23): ND Sta. Eugénia (playground photo) and Celeirós (no
playground) given today's founding date; one goal each of André Cruz (53 goals → 50, club Várzea)
and Diogo Oliveira (76 → 75, no club) moved into the last 24 h. Same 16 posts (row by row) and the
same two idempotency keys; eight images at legacy's sizes, same layout, mean pixel difference
1.4–5.8 out of 255. Clubs, goals, posts, keys and `/storage/tmp` restored. Not cut over.

## `publish-social-media`

**Ported** (`publish-social-media.ts` + `.rules.ts`), every minute, in two phases like legacy:

1. **Prepare** posts due in the next 15 minutes (or up to 1 minute late) that have no
   `media_external_id`: Facebook stories upload the photo or video unpublished, Instagram creates
   the container (image, reel, story photo or video). The id goes to `media_external_id`; a
   failure goes to `error_message`. Facebook posts need no preparation.
2. **Publish** posts due now (up to 5 minutes late), oldest first: Facebook stories and Instagram
   publish the prepared id (Instagram waits for the container to be `FINISHED`, up to 5 checks
   2 s apart); Facebook text posts go to the feed with the first link of the text as the link
   preview (every link removed from the message); Facebook image posts go to `/photos` with the
   text as caption. Success sets `post_id` and `published`.

`rules.ts` (`prepareCall()`, `publishCall()`, `splitLink()`) decides the Graph call for a post and
is unit tested with a recording poster. Dry run (the default) logs what it would prepare and
publish and changes nothing.

**Changed from legacy** (decided 2026-10-24): **Facebook failures are retried like Instagram
ones.** Legacy marked a Facebook post (or story) that failed as `published`, with its error and
no `post_id`, so it was never tried again. Now a failure on either network only records
`error_message` (`publishFailure()`): the post stays unpublished and is tried again every minute
while it is inside the 5-minute window (a story whose upload failed is also prepared again during
its first minute). As in legacy, a retry that succeeds sets `post_id` and `published` and keeps
the earlier error, which the admin shows as an earlier attempt's.

**No double Facebook posts** (decided 2026-10-24): Facebook is retried only when it answered with
a Graph error, which means it refused the request and created nothing (`GraphError.rejected`, also
set when a setting is missing and nothing was sent). A Facebook publish request without such an
answer (timeout after 30 s, dropped connection, a gateway's HTTP error page without a Graph
error) may have created the post, so it is not sent again: the post is marked done like legacy's
failures (`published`, no `post_id`) with "No answer from Facebook, not tried again (it may have
been posted: check the page before publishing it again): …" and the cause (e.g. `fetch failed
(UND_ERR_SOCKET)`). The admin shows it as failed, with a notice to check the Facebook page before
using "Publish again". Instagram is always retried: it publishes a prepared container, which
can't be published twice. Preparation (unpublished uploads, containers) is always retried too.

**Kept as legacy** (to confirm before the cutover):

- A Facebook **video post** (not story) is marked published without any call: legacy never
  implemented it (`schedule-social-media` and the birthday/milestone jobs don't create them; the
  admin form still allows them, so a manual one would be silently skipped).
- A post more than 5 minutes late is never published (shown as "missed" in the admin, which can
  retry it).

**Fixes:**

- An Instagram post or Facebook story reaching its time without a prepared id (preparation
  failed, or it was created less than a minute before) crashed legacy with a `TypeError` on the
  null id (it only catches `\Exception`), which ended the run: the posts after it waited, every
  minute, until that post left the 5-minute window. The port records "The media was not prepared
  before the publication time" on that post and goes on.
- A Facebook text story (impossible to publish) gets the error "Invalid post content type: text"
  instead of a crash.
- The preparation error is kept: legacy overwrote it with the publish error a minute later.
- An Instagram container in `ERROR` stops the wait at once (legacy's own `catch` retried it).

**Fake Graph API.** Nothing is ever posted from a test. `FB_GRAPH_URL` (new setting, default
`https://graph.facebook.com`) points the worker at a fake server, and the legacy site is pointed at
the same one through a proxy:

- A small Node server (`node:http`) answers the Graph endpoints with predictable ids
  (`container_1`, `photo_story_1`, `ig_media_1`, `FAKEPAGE_feed_1`, …), returns a Graph error
  for any request whose fields contain `fail`, and gives no answer for `drop` (closes the
  connection), `hang` (never answers) and `gateway` (502 HTML page), reports containers as
  `FINISHED`, serves 2 KB of
  bytes under `/media/…` for the video uploads, and logs every request (method, path, fields,
  headers) to a JSON-lines file per run.
- Worker: `FB_GRAPH_URL=http://127.0.0.1:8787` with fake `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`,
  `FB_SYSTEM_USER_TOKEN`, `IG_USER_ID` and `WORKER_DRY_RUN=false`, then
  `node --env-file=.env build/worker/index.js run publish-social-media` (inline variables win over
  `.env`).
- Legacy (Guzzle, hard-coded `graph.facebook.com` and `rupload.facebook.com`): `php artisan
tinker` in its container with `HTTPS_PROXY` set to the fake server's CONNECT proxy, which
  terminates TLS with a self-signed certificate (legacy skips TLS verification outside
  production), and the same fake page/IG ids and tokens.
- Before a run: check that no scheduler (legacy `schedule:run`, the worker) is running and that
  only the test rows are inside the windows (`publish_at` between now − 5 min and now + 15 min).

**Compared with legacy** (2026-10-24): 14 test posts covering every branch: Facebook story
(image, video), Instagram post, story and reel (image, video), Facebook text post with a link,
Facebook image and video posts, a failing Facebook and a failing Instagram post, a story due in
10 minutes (prepared only), one 10 minutes late (skipped) and one already published. Legacy and
the worker, each on a fresh copy of the rows: the same 22 Graph requests in the same order
(endpoints, fields, tokens, the `rupload` headers of the video stories) and the same resulting
rows (`published`, `media_external_id`, `post_id`, `error_message`), after the fixes above.
Dry run: no request, rows unchanged. A second run retries only the failed Instagram post. Test
rows deleted. Not cut over.

**Facebook retries** (2026-10-24, after the change above, fake Graph API): four failing posts
(Facebook image post, Facebook text post, Facebook story, Instagram post) all stayed unpublished
with their errors. With the image post's and the story's media fixed, the next run published the
image post (second `/photos` request), prepared and published the story, and tried the text post
again (second `/feed` request, failed again); both published posts kept the first error. Moved
6 minutes late, the two failing posts got no more requests. In the admin: the published ones as
"published" with the error as an earlier attempt's, the other two as "failed" with retry. Test rows
deleted.

**No answer from Facebook** (2026-10-24, fake Graph API): six due posts. A Facebook text post
whose connection was dropped, a Facebook photo post answered with a 502 page and one that never
got an answer (timed out after 30 s) were marked done with the "No answer from Facebook" error. A
Facebook text post refused with a Graph error, and a Facebook story and an Instagram post whose
uploads were dropped stayed unpublished. The next run sent only the refused post again. In the
admin: the dropped one as failed, with its error, "Publish again" and the notice to check the
page. Test rows deleted.

**End to end with the admin section** (2026-10-24): an Instagram image post created in the admin
with an uploaded PNG (stored as `/storage/social_media/<uuid>.jpg`), edited (new image, new
caption: the preparation was reset and the old file deleted), marked failed, retried from the
admin (due a minute later), then prepared and published by the worker against the fake Graph API
with the edited caption and the new image URL; deleted from the admin (row and file gone, five
audit rows). Test user, rows, audit rows and files removed afterwards.

## Admin section: social media posts

New, the legacy backoffice had none: `/social-media-posts` (Conteúdo → Redes sociais), for what
the worker publishes.

- **List**: search (text, media URL, `#id`), filters by state and network, sort by id or time
  (newest time first). States, the same rules in SQL and in `postStatus()`: scheduled, prepared
  (has `media_external_id`), published (also with an error when it has a `post_id`: a retry
  succeeded after it; the 9 Instagram posts legacy retried look like this), failed (has
  `error_message` and no `post_id`, including the Facebook post legacy marked published),
  missed (unpublished and more than 5 minutes late).
- **Post page**: state, network id (a link on Facebook), prepared id and error (in yellow, as an
  earlier attempt's, when the post was published anyway); the form is read-only once published.
  A failed post marked done (no answer from Facebook, or a legacy Facebook failure) says the
  worker won't try it again and to check the Facebook page before publishing it again.
- **Create / edit** (unpublished only): network, type, content, time (in the admin's timezone),
  a media URL or an uploaded JPEG/PNG (optimised, stored under `/storage/social_media/`, not
  `/storage/tmp/`, so the cleanup job doesn't remove it before the time), text. The form only
  accepts what the job can publish: text only as a Facebook post (and then required), media for
  images and videos (videos by URL only), no text on stories, a new or moved time in the future.
  Saving a change clears `media_external_id`, `error_message` and `post_id`, so the post is
  prepared again.
- **Retry** (failed or missed): back to unpublished without id or error, due in one minute.
- **Delete**: only the row (and its uploaded image); a post already on Facebook or Instagram stays
  there, which the confirmation says.
- Permissions `social_media_posts` (view), `.create` (create, delete), `.edit` (edit, retry),
  like the other sections; they don't exist in the legacy `permissions` table, so create them in
  Permissions to grant them to non-admins. Every write is audited (model `SocialMediaPost`).

## Decisions

- **Legacy switch:** when a job is ported, comment it out in the legacy `Kernel` (step 4 above).
- **GPT commands:** not ported, no longer used.
- **Overlap:** the worker skips a tick while the job's previous run is still going, and the
  MySQL lock keeps two processes from running the same job (already implemented).

## What exists

- `src/worker/main.ts`: CLI (`list`, `run <job>`, default: start the scheduler).
- `src/worker/scheduler.ts`: croner wiring, heartbeat, graceful shutdown.
- `src/worker/runner.ts`: one run of a job: MySQL lock, timing, logging, errors.
- `src/worker/jobs/index.ts`: the registry above (name, legacy class, cron, ported or not);
  `src/worker/jobs/<name>.ts` (+ `.rules.ts`, `.spec.ts`): the ported jobs.
- `src/worker/time.ts`: Lisbon days and Portuguese date words, as the legacy jobs use them.
- `src/worker/social/graph.ts`: Facebook / Instagram Graph API client (`FB_GRAPH_URL` for the
  fake one in tests).
- `src/lib/server/social-media-posts/` + `src/routes/(app)/social-media-posts/`: the admin
  section for the posts.
- `src/worker/mail/`: SMTP mailer and the emails; `src/worker/images/` + `src/worker/assets/`:
  image drawing and its fonts and pictures.
- `src/worker/app-env.ts` + `vite.worker.config.ts`: worker build and `$app/env/private`
  replacement.
- `ecosystem.config.cjs`: the `domingoasdez-admin-worker` app; `scripts/deploy.sh`: builds it,
  reloads it with the admin and checks its heartbeat (also on `--rollback`).
