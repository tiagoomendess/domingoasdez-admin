## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, enhanced-img, sveltekit-adapter, drizzle, paraglide, ai-tools
- **UI**: flowbite-svelte, flowbite-svelte-icons

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Project Context

**Project Goal**: @FIRST_PLAN.md
**Architecture and conventions**: @docs/architecture.md

Admin backoffice for Domingo às Dez. It shares the legacy Laravel MySQL database and R2 bucket with
the legacy site (`E:\Projetos\DomingoAsDez`) and the new public app
(`C:\Users\Tiago\Desktop\repos\domingoasdez-app`). When porting a section, read the legacy
controller (`app/Http/Controllers/Resources/*Controller.php`) and view
(`resources/views/backoffice/pages/*`) first and keep the same validation and side effects.

## Rules

- **Schema changes only through migrations** (docs/architecture.md, "Migrations"): edit
  `src/lib/server/db/schema.ts`, `npm run db:generate -- --name <what>`, review the SQL. Follow the
  compatibility rules (expand, then contract: the legacy jobs and the public app share the DB).
  Never `drizzle-kit push`, never edit an applied migration, no DDL outside migrations, no new
  Laravel migrations.
- Locally the legacy site, the public app and this admin share one database, `dad_db` (a
  production dump, like production's single database, in the local Docker MySQL). Running
  `npm run db:migrate` there is fine; never touch the production database or R2 bucket.
- **Temporary test data: direct SQL on the local Docker `dad_db` only.** To set up a case to
  check in the UI (move a game's date, add votes, change scores, …) you may run
  `INSERT` / `UPDATE` / `DELETE` against it directly. Note the original values first and put
  them back after the test (delete the rows you added) whenever possible, and report what you
  changed and whether it was restored. Data only, never DDL; lasting changes to schema or data
  go through migrations. The local legacy jobs run on the same data (mail to real
  users, social media publishing), so avoid changes that would trigger them.
- Every `load`, form action and endpoint calls `requirePermission(...)` from
  `#lib/server/auth/guard.ts` with the legacy permission name (`<resource>`, `.create`, `.edit`).
- Every create / update / delete calls `audit()` from `#lib/server/audit.ts` with before/after rows.
- Store files only through `#lib/server/storage` (`/storage/...` paths, R2 keys without the slash);
  process images with `optimizeImage()`. Delete replaced files with `deleteFile()`.
- Dates in the DB are UTC. Convert to the admin's timezone only in the UI.
- Use Flowbite Svelte components inside pages; support light and dark mode in everything.
- Related-entity selects are searchable, lazy-loaded and debounced (see "Searchable dropdowns").
- All UI text goes through Paraglide messages (`messages/pt-PT.json` and `messages/en.json`).
- Validate form input with zod via `parseForm()` from `#lib/server/forms.ts`.
- Before finishing: `npm run validate` (lint, type check, unit tests) must pass.
