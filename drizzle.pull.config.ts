import { defineConfig } from 'drizzle-kit';
import config from './drizzle.config';

// `npm run db:pull`: introspects the database into ./drizzle/pull (git-ignored) so it can be
// compared with src/lib/server/db/schema.ts. Reference only, never migrated.
export default defineConfig({ ...config, out: './drizzle/pull' });
