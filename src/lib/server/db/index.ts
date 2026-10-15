import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { DATABASE_URL } from '$app/env/private';
import * as relations from './relations';
import * as schema from './schema';

// The legacy Laravel app runs in UTC and stores naive DATETIME/TIMESTAMP values.
// - dateStrings: return them as strings so Drizzle parses them as UTC (no local-time shift)
// - timezone 'Z': anything mysql2 serialises itself is UTC too
const createPool = () =>
	mysql.createPool({
		uri: DATABASE_URL,
		dateStrings: true,
		timezone: 'Z',
		connectionLimit: 10,
		enableKeepAlive: true,
		// mysql2 only reaps idle connections when maxIdle < connectionLimit. With the reaper on,
		// a connection idle for idleTimeout is closed, so a pool nobody uses (one orphaned by a
		// dev reload, or a quiet server) gives its connections back to MySQL within a minute.
		maxIdle: 5,
		idleTimeout: 60_000
	});

// Vite re-runs this module on every server-side reload in dev. Reuse the pool across reloads:
// a new pool each time leaks the old one's open connections until MySQL refuses new ones.
const shared = globalThis as typeof globalThis & { __dadAdminPool?: mysql.Pool };
const pool = (shared.__dadAdminPool ??= createPool());

export const db = drizzle(pool, { schema: { ...schema, ...relations }, mode: 'default' });

export type Database = typeof db;
/** A transaction handle, for helpers that must run inside `db.transaction()`. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
