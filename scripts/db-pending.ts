// `npm run db:pending`: prints the migrations `npm run db:migrate` would apply, one tag per line
// (nothing when the database is up to date). scripts/deploy.sh uses it to back up the database
// before migrating. Same rule as drizzle's MySQL migrator: a migration is pending when it is newer
// than the last one recorded in __drizzle_migrations.
import { existsSync, readFileSync } from 'node:fs';
import mysql, { type RowDataPacket } from 'mysql2/promise';

const MIGRATIONS_TABLE = '__drizzle_migrations';

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL is not set');

const journal = JSON.parse(readFileSync('./drizzle/migrations/meta/_journal.json', 'utf8')) as {
	entries: { when: number; tag: string }[];
};

const connection = await mysql.createConnection(url);
try {
	const [table] = await connection.query<RowDataPacket[]>(
		`select count(*) as count from information_schema.tables
		 where table_schema = database() and table_name = ?`,
		[MIGRATIONS_TABLE]
	);
	let last = 0;
	if (table[0].count > 0) {
		const [rows] = await connection.query<RowDataPacket[]>(
			`select max(created_at) as last from \`${MIGRATIONS_TABLE}\``
		);
		last = Number(rows[0].last ?? 0);
	}
	for (const entry of journal.entries) {
		if (entry.when > last) console.log(entry.tag);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
} finally {
	await connection.end();
}
