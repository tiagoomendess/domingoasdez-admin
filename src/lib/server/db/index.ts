import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { DATABASE_URL } from '$app/env/private';
import * as relations from './relations';
import * as schema from './schema';

// The legacy Laravel app runs in UTC and stores naive DATETIME/TIMESTAMP values.
// - dateStrings: return them as strings so Drizzle parses them as UTC (no local-time shift)
// - timezone 'Z': anything mysql2 serialises itself is UTC too
const pool = mysql.createPool({
	uri: DATABASE_URL,
	dateStrings: true,
	timezone: 'Z',
	connectionLimit: 10,
	enableKeepAlive: true
});

export const db = drizzle(pool, { schema: { ...schema, ...relations }, mode: 'default' });

export type Database = typeof db;
/** A transaction handle, for helpers that must run inside `db.transaction()`. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
