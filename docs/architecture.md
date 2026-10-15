# Architecture and conventions

This admin replaces the backoffice of the legacy Laravel site (`E:\Projetos\DomingoAsDez`). The
public site is being replaced separately by `domingoasdez-app`. All three apps share one MySQL
database and one Cloudflare R2 bucket during the transition, so **compatibility with the legacy
data model is the first rule**.

## Scope

- In scope: managing entities (CRUD) and manual review flows (player update requests, info
  reports, score report bans, permissions).
- Out of scope, stays on the legacy site: cron jobs, queues and artisan commands (social media
  publishing, game/poll image generation, karma, email outbox, delete requests), the log viewer.
  The admin only sets the flags those jobs read (e.g. `games.generate_image`, `polls.update_image`).

## Porting a legacy section: bugs

Port from the legacy controller and views and keep their validation and side effects (see
`AGENTS.md`). When the legacy code turns out to be wrong:

- **Obvious bug: fix it.** Behaviour that can only be a mistake: a crash or SQL error, validation
  that contradicts the column (legacy clubs validated `website` up to 280 characters for a
  155-character column), a permission check on the wrong name (the legacy clubs list showed
  "add" to `clubs.edit` instead of `clubs.create`). Leave a short comment at the fix saying what
  the legacy code did, and list the fix when reporting the work.
- **Not sure it is a bug: ask first.** When the behaviour could be intentional (a check that only
  runs on create, files that are never deleted, an unexpected side effect such as emblems being
  added to the media library), describe the legacy behaviour and the change you would make, and
  ask whether it is expected. Keep the legacy behaviour until the answer comes.

## Stack

| Concern    | Choice                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| Framework  | SvelteKit 3 + Svelte 5 (runes), TypeScript, `adapter-node` (PM2 behind nginx)           |
| UI         | Flowbite Svelte + Tailwind CSS 4, `flowbite-svelte-icons`                               |
| Data       | Drizzle ORM + `mysql2` on the legacy database                                           |
| Validation | zod 4 (`parseForm` in `src/lib/server/forms.ts`)                                        |
| Files      | Cloudflare R2 via `@aws-sdk/client-s3`; images processed with `sharp`                   |
| i18n       | Paraglide (`pt-PT` base, `en`), language from cookie / `Accept-Language`, no URL prefix |
| Tests      | Vitest (node + browser projects), Playwright e2e against the production build           |

Remote functions are still experimental in SvelteKit 3.0, so pages use `load` + form actions,
and JSON endpoints under `/api/` for client-side data (searchable dropdowns).

## Database

- `src/lib/server/db/schema.ts` mirrors the live schema (introspected with `drizzle-kit pull`,
  then curated). **Laravel migrations own the schema.** Never run `drizzle-kit push/generate/
migrate`; those scripts were removed on purpose. After a Laravel migration, run
  `npm run db:pull` and port the diff from `./drizzle/schema.ts` by hand.
- `created_at` / `updated_at` are filled automatically (`timestamps` in `db/columns.ts`), like
  Eloquent does. Don't set them by hand.
- Laravel runs in UTC and stores naive datetimes. The pool uses `dateStrings: true` +
  `timezone: 'Z'`, so instants come back as UTC `Date`s. Convert to the admin's timezone only in
  the UI (`timezone` cookie, defaults to `Europe/Lisbon`). Calendar dates (`clubs.founding_date`,
  `players.birth_date`) are strings, never `Date`s.
- `POINT` columns (`playgrounds.location`, `score_reports.location`) use the `latLngPoint` type.
  The legacy convention is `POINT(lat lng)` with SRID 0: **X is the latitude**.
- Relations for `db.query.*` live in `db/relations.ts`.

## Authentication and permissions

- Login uses the legacy `users` table: bcrypt `$2y$` hashes (`auth/password.ts`), verified and
  not banned (`user_bans.pardoned = 0`). Same email/password as the old site and the new app.
- Access to the admin requires the `dashboard` permission (or `admin`), like the legacy
  `DashboardController`. Users and permissions are re-loaded on every request, so revoking access
  or banning a user takes effect immediately.
- Sessions are stateless, HMAC-signed cookies (`dad_admin_session`, separate from the public
  app's `dad_session`). 12 h sliding idle timeout, 30 days with "Keep me signed in". The token
  carries a fingerprint of the password hash: changing the password (anywhere) signs out every
  admin session.
- Login attempts are throttled (5 per minute per email + IP) and audited (`login`,
  `login_failed`, `logout`), as on the legacy site.
- `hooks.server.ts` authenticates every request except `/login` and `/healthz` (pages redirect to
  `/login?redirectTo=…`, `/api/*` gets a 401). **Authorization is per route:** every `load`, form
  action and endpoint starts with `requirePermission('<resource>[.create|.edit]')` from
  `auth/guard.ts`. Layout loads alone do not protect actions.
- Permission names (`src/lib/auth/permissions.ts`): `<resource>` to view, `<resource>.create` to
  create/delete, `<resource>.edit` to edit, `admin` grants everything. The UI hides what the user
  can't do (`can(user.permissions, …)`), the server enforces it.

## Writes: audit log

Every create / update / delete calls `audit()` (`src/lib/server/audit.ts`) with the row before
and after. Rows go to the shared `audit` table in the same format the legacy `Audit::add()` uses
(snake_case JSON, `Y-m-d H:i:s` dates, Eloquent class name as `model`), so the history stays in
one place. Passwords and tokens are stripped. Updates that change nothing are not logged.

## Files (Cloudflare R2)

- The DB stores public paths like `/storage/media/images/<uuid>.jpg`; the R2 key is the same path
  without the leading slash. This matches the legacy `UploadStorage` (UPLOADS_DISK=r2), so both
  sites read and write the same objects.
- `storage/index.ts`: `storeFile()` (new uuid name, immutable cache headers), `deleteFile()`
  (never throws). Files in `/storage/tmp/` get a short cache.
- `storage/images.ts` ports the legacy `ImageOptimizer`: EXIF rotation, max 2048 px (content) or
  800 px squares (players, referees, coaches, emblems), progressive JPEG q82, PNG only when the
  image uses transparency, metadata (GPS) stripped, GIF/SVG stored as uploaded.
- Display URLs: `mediaUrl()` in `media.ts` (legacy origin, or the R2 domain when
  `MEDIA_CDN_ENABLED`). Same rules as `domingoasdez-app`.
- Uploads need `BODY_SIZE_LIMIT` raised in production (adapter-node defaults to 512 KB).

## UI conventions

- Shell: blue top bar with the site name centred, left side nav with the legacy groups (Conteúdo,
  Pessoas, Competições, Jogos, Clubes, Outros) and the legacy user header. Defined in
  `src/lib/navigation.ts`; entries are filtered by permission. On small screens the side nav is a
  drawer. The shell is plain Tailwind (Flowbite's `Sidebar` only renders after measuring the
  window, which makes the menu pop in); everything inside pages uses Flowbite components.
- Light/dark mode: `theme` cookie (`light`/`dark`, absent = follow the OS), applied before first
  paint by `src/app.html`; toggle in the top bar. Always style both modes (`dark:` variants).
- Primary colour is the legacy blue (`#1976d2` = `primary-700`).
- All user-facing text goes through Paraglide (`m.key()` from `#lib/paraglide/messages.js`);
  add keys to both `messages/pt-PT.json` and `messages/en.json`.
- Internal links use `resolve()` from `$app/paths` (enforced by ESLint).
- Imports from `src/lib` use the `#lib/...ts` alias with explicit extensions.

### Section building blocks

Clubs (`/clubs`) and Teams (`/teams`) are the reference sections: copy their shape.

- Routes: `<section>/` (list), `<section>/new` (create, default action) and
  `<section>/[id=id]` (edit form with `?/save` and `?/delete`; read-only for admins without
  `.edit`). `[id=id]` (`src/params.ts`) gives `params.id` as a number.
- Server code lives in `src/lib/server/<section>/`: `form.ts` (pure zod schema, unit tested),
  `index.ts` (list/find/option queries) and `save.ts` (create/update + side effects + audit).
- **Lists**: `parseListParams()` / `listState()` (`#lib/server/list.ts`) read `?q=&sort=&dir=&page=`
  (25 rows, sort columns from an allow-list). Pages use `PageHeader`, `ListSearch` (300 ms
  debounced), `SortHeader`, `ListPagination`, `EmptyState` and `CreateButton` (rendered only with
  the given permission) from `#lib/components/list/`, inside a Flowbite `Table`.
- **Forms**: `parseForm()` translates zod messages to the request language; field schemas
  (`requiredText`, `optionalEmail`, `optionalUrl`, `optionalFile`, `requiredId`, …) are in
  `#lib/server/validation.ts`. Actions return `invalid(errors, values)` and redirect on success
  after `setFlash()` (toast shown by the layout). `EntityForm` (enhance, error summary, sticky
  save bar, read-only mode) passes failures to `TextField` / `ToggleField` / `ImageField` /
  `FormField` by field `name`. `DeleteButton` confirms in a modal and posts `?/delete` (keep it
  outside the entity form).
- Writes skip unchanged columns (`changedColumns()`), like Eloquent, so a no-op save neither
  touches `updated_at` nor logs an audit row. Deletes blocked by a foreign key return
  `form_delete_in_use` (`isRowReferencedError()`).
- Uploaded pictures follow the legacy controllers: `storeImage()` (`storage/uploads.ts`, real
  format read from the bytes) plus a `media` library row with thumbnail (`insertImageMedia()`).
  A replaced file is deleted only when nothing else uses it (legacy uploads always have a
  `media` row, so those stay).

### Searchable dropdowns

Every select of a related entity (club, team, player, season, …) is a searchable, lazy-loaded
combobox — never a full `<select>` of a table:

- Endpoint: `GET /api/options/<entity>?q=<text>&page=<n>` →
  `{ items: { value, label, description?, image? }[], hasMore }`, 20 per page, permission
  checked, searched with `LIKE` on indexed columns, ordered by relevance/priority. Helpers:
  `parseOptionsQuery()` / `toOptionsPage()` (`#lib/server/options.ts`). Public data (club names
  and emblems) only needs `dashboard`; personal data (users) needs the permission of a section
  that uses the select (`requireAnyPermission()`).
- Component `SearchSelect.svelte`: 300 ms debounce, aborts in-flight requests
  (`AbortController`), loads the next page on scroll, keyboard navigable (combobox ARIA pattern),
  submits the id through a hidden input, and receives the current option from the page `load`
  so edit forms render the label without a round trip. Wrap it in `FormField` for the label and
  errors.

### Location picker (playgrounds)

Replace Google Maps with Leaflet + OpenStreetMap tiles (attribution required). Address search
goes through a server endpoint that calls Nominatim (custom User-Agent, ≤ 1 request/s, cached),
never from the browser. Store with `latLngPoint` (`POINT(lat lng)`).

## Security

- CSP (in `vite.config.ts`), `X-Frame-Options: DENY`, `nosniff`, strict referrer policy,
  `noindex` (header, meta and `robots.txt`), `Cache-Control: private, no-store` for signed-in
  responses.
- SvelteKit's CSRF origin check is on (production builds); logout is POST-only.
- HTML from articles/pages is admin-authored but must still be sanitised before rendering in the
  admin (e.g. `isomorphic-dompurify`, as `domingoasdez-app` does).
- `SESSION_SECRET` must be unique per environment (≥ 32 chars). Use an R2 token scoped to the
  uploads bucket only.

## Known cross-app caveats

- The legacy site caches some pages in its **file cache** (`today_games_cache`, `live_matches`,
  game pages) and invalidates it in `Game::invalidateCache()`. The admin cannot reach that cache,
  so legacy pages may show stale game data until the cache expires. The new public app reads the
  database directly and is not affected.
- Login throttling is per process: run a single PM2 instance (already configured).

## Sections to port

Same entries as the legacy side nav. Each section is a list page (search, pagination, sort),
create/edit forms and delete, guarded by its permissions and audited.

| Group       | Route                     | Tables                                                    | Permission prefix        | Notes                                                                                                                                            |
| ----------- | ------------------------- | --------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| —           | `/`                       | (aggregates)                                              | `dashboard`              | Legacy metrics: pending update requests, bans, unseen info reports, partner clicks, MVP votes / score reports 24 h, flash interviews 48 h, users |
| Conteúdo    | `/articles`               | `articles`, `media`                                       | `articles`               | Rich-text body (legacy CKEditor), cover from media                                                                                               |
| Conteúdo    | `/pages`                  | `pages`                                                   | `pages`                  | Rich-text body, unique slug                                                                                                                      |
| Conteúdo    | `/media`                  | `media`                                                   | `media`                  | Image/video/file uploads to R2, YouTube links, thumbnails                                                                                        |
| Conteúdo    | `/polls`                  | `polls`, `poll_answers`                                   | `polls`                  | Image generation stays on legacy (`update_image`)                                                                                                |
| Pessoas     | `/players`                | `players`, `transfers`                                    | `players`                | Square photo                                                                                                                                     |
| Pessoas     | `/player-update-requests` | `player_update_requests`                                  | `player_update_requests` | Approve / deny flow                                                                                                                              |
| Pessoas     | `/team-agents`            | `team_agents`, `team_agents_history`                      | `team_agents`            |                                                                                                                                                  |
| Pessoas     | `/referees`               | `referees`                                                | `referees`               |                                                                                                                                                  |
| Pessoas     | `/users`                  | `users`, `user_profiles`, `user_permissions`, `user_bans` | `users`, `permissions`   | Grant/revoke permissions, ban/pardon                                                                                                             |
| Pessoas     | `/score-report-bans`      | `score_report_bans`                                       | `score-report-bans`      |                                                                                                                                                  |
| Competições | `/competitions`           | `competitions`                                            | `competitions`           | Priority order                                                                                                                                   |
| Competições | `/seasons`                | `seasons`                                                 | `seasons`                |                                                                                                                                                  |
| Competições | `/game-groups`            | `game_groups`                                             | `game_groups`            |                                                                                                                                                  |
| Competições | `/group-rules`            | `group_rules`, `group_rules_positions`                    | `group_rules`            | Tie-breaker script                                                                                                                               |
| Jogos       | `/games`                  | `games`, `game_referees`, `goals`                         | `games`                  | Legacy CSV import (`/games/import`)                                                                                                              |
| Jogos       | `/game-comments`          | `game_comments`                                           | `games`                  | Flash interviews                                                                                                                                 |
| Jogos       | `/goals`                  | `goals`                                                   | `goals`                  |                                                                                                                                                  |
| Clubes      | `/clubs`                  | `clubs`                                                   | `clubs`                  | Emblem (PNG when transparent)                                                                                                                    |
| Clubes      | `/teams`                  | `teams`                                                   | `teams`                  |                                                                                                                                                  |
| Clubes      | `/transfers`              | `transfers`                                               | `transfers`              |                                                                                                                                                  |
| Outros      | `/playgrounds`            | `playgrounds`                                             | `playgrounds`            | OpenStreetMap location picker                                                                                                                    |
| Outros      | `/partners`               | `partners`, `partner_clicks`                              | `partners`               |                                                                                                                                                  |
| Outros      | `/permissions`            | `permissions`                                             | `permissions`            |                                                                                                                                                  |
| Outros      | `/info-reports`           | `info_reports`                                            | `info_reports`           | Status workflow (sent → seen → used/archived)                                                                                                    |
| Outros      | `/audit`                  | `audit`                                                   | `admin`                  | Read-only                                                                                                                                        |
| Outros      | `/settings`               | `variables`                                               | `admin`                  | Legacy key/values; mask secrets (`api_access_token`)                                                                                             |
