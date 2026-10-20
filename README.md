# Domingo às Dez — Admin

Backoffice for [domingoasdez.com](https://domingoasdez.com), replacing the admin area of the
legacy Laravel site. It manages the same data (same MySQL database, same R2 bucket, same logins)
while the legacy site keeps running the automated jobs.

- Goals: [FIRST_PLAN.md](FIRST_PLAN.md)
- Decisions, conventions and the list of sections to port: [docs/architecture.md](docs/architecture.md)
- Related: legacy site `E:\Projetos\DomingoAsDez`, public app `domingoasdez-app`

**Stack:** SvelteKit 3 · Svelte 5 · TypeScript · Flowbite Svelte + Tailwind CSS 4 · Drizzle ORM
(MySQL) · Cloudflare R2 · Paraglide i18n · Vitest · Playwright

## Getting started

Requirements: Node.js 24 (`.nvmrc`), the legacy MySQL database (local Docker container
`local-mysql`) and, for uploads, R2 credentials.

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env` (see the comments there): `DATABASE_URL`, a random `SESSION_SECRET`, and the
`R2_*` keys (same values as the Laravel `.env`) if you need uploads. Then:

```bash
npm run dev
```

Open <http://localhost:5173> and sign in with a legacy account that has the `dashboard` (or
`admin`) permission.

> Locally the admin, the legacy site and the public app share one database, `dad_db`, loaded
> from a production dump, the same layout as production. The admin **writes** to it, so the
> other two see your test data.

## Scripts

| Script                              | What it does                                                  |
| ----------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                       | Dev server on :5173                                           |
| `npm run build` / `npm run preview` | Production build (`build/`) / preview it on :4173             |
| `npm start`                         | Run the production build with `.env`                          |
| `npm run check`                     | Type check (svelte-check)                                     |
| `npm run lint` / `npm run format`   | Prettier + ESLint / format everything                         |
| `npm run test:unit`                 | Vitest (server tests in Node, `*.svelte.spec.ts` in Chromium) |
| `npm run test:e2e`                  | Playwright against the production build (no database needed)  |
| `npm run validate`                  | lint + check + unit tests (run before pushing)                |
| `npm run db:generate -- --name <x>` | New migration from the changes in `schema.ts`                 |
| `npm run db:migrate`                | Apply pending migrations                                      |
| `npm run db:baseline`               | Mark an existing (Laravel-built) DB as migrated up to 0000    |
| `npm run db:check`                  | Check the migration files                                     |
| `npm run db:pull`                   | Introspect the DB into `./drizzle/pull/` to look for drift    |
| `npm run db:studio`                 | Drizzle Studio                                                |

This app owns the database schema: see [Migrations](docs/architecture.md#migrations). There is
deliberately no `db:push`.

## Project structure

```
src/
  env.ts                    typed, validated environment variables
  hooks.server.ts           locale, authentication, security headers, error logging
  lib/
    auth/                   permission names + can(), AdminUser type (shared with the client)
    components/shell/       top bar, side nav, user menu, theme toggle
    navigation.ts           side nav groups (mirrors the legacy backoffice)
    server/
      auth/                 password (bcrypt $2y$), sessions, guard, throttle, user loading
      db/                   Drizzle schema + relations of the legacy database
      storage/              R2 uploads and image optimisation
      audit.ts              writes to the shared audit table
      forms.ts              zod form parsing for actions
      media.ts              DB paths → public media URLs
  routes/
    (app)/                  everything behind the login (shell layout)
    login/  logout/  healthz/
messages/                   pt-PT (base) and en translations
drizzle/migrations/         schema migrations (this app owns the database schema)
scripts/                    db-baseline.ts
docs/                       architecture and conventions
```

## Deployment

Same setup as `domingoasdez-app`: Node + PM2 behind nginx (and Cloudflare).

```bash
npm ci
```

When the release has new migrations, back up the database first (`mysqldump --single-transaction`
or a host snapshot), then:

```bash
npm run db:migrate
```

```bash
npm run build && pm2 startOrReload ecosystem.config.cjs
```

Deploy `domingoasdez-app` after the admin when it uses the new columns. The first time only, mark
the production database as migrated with `npm run db:baseline` (before any `db:migrate`).

Set the production variables in `.env` (`ORIGIN`, `PORT`, `PROTOCOL_HEADER`,
`ADDRESS_HEADER=CF-Connecting-IP`, `BODY_SIZE_LIMIT` for uploads — see `.env.example`). nginx
proxies the admin host to `PORT`, with `client_max_body_size` at least `BODY_SIZE_LIMIT`: the
site config is [nginx.conf](nginx.conf) (install steps at the top of the file).
`GET /healthz` checks the app and the database for uptime monitoring.

CI (`.github/workflows/ci.yml`) runs lint, type check, unit/component tests and e2e tests on
every push and pull request.
