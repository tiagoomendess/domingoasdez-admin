import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// WARNING: this app shares the legacy Laravel database, whose schema is owned by Laravel
// migrations. Never run `drizzle-kit push`, `generate` or `migrate` against it.
//
// `npm run db:pull` introspects the live database into ./drizzle (git-ignored) so it can be
// diffed against src/lib/server/db/schema.ts after Laravel adds a migration.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'mysql',
	dbCredentials: { url: process.env.DATABASE_URL },
	tablesFilter: ['!migrations'],
	verbose: true,
	strict: true
});
