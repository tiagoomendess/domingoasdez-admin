// `npm run db:baseline`: marks a database built by the legacy Laravel migrations as migrated up to
// drizzle/migrations/0000_baseline.sql, without running it. Run once per existing database
// (production, dad_db, dad_db_admin); fresh databases run the baseline with `npm run db:migrate`.
import { existsSync } from 'node:fs';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import mysql, { type RowDataPacket } from 'mysql2/promise';

/** The last Laravel migration the baseline includes. */
const LAST_LARAVEL_MIGRATION = '2026_09_25_114800_add_team_to_player_update_requests_table';
const MIGRATIONS_TABLE = '__drizzle_migrations';
/** Laravel's `collation` (config/database.php); every table it created uses it. */
const TABLE_COLLATION = 'utf8mb4_unicode_ci';

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL is not set');

const [baseline] = readMigrationFiles({ migrationsFolder: './drizzle/migrations' });
if (!baseline) throw new Error('drizzle/migrations has no baseline migration');

const connection = await mysql.createConnection(url);
try {
	const [[{ name }]] = await connection.query<RowDataPacket[]>('select database() as name');

	const [laravel] = await connection.query<RowDataPacket[]>(
		`select count(*) as count from information_schema.tables
		 where table_schema = database() and table_name = 'migrations'`
	);
	if (laravel[0].count === 0) {
		throw new Error(`${name} was not built by Laravel: run \`npm run db:migrate\` instead`);
	}
	const [last] = await connection.query<RowDataPacket[]>(
		'select migration from migrations order by id desc limit 1'
	);
	if (last[0]?.migration !== LAST_LARAVEL_MIGRATION) {
		throw new Error(
			`${name} ends at Laravel migration ${last[0]?.migration ?? '(none)'}, the baseline at ` +
				`${LAST_LARAVEL_MIGRATION}: run the missing Laravel migrations first`
		);
	}

	// Migration 0001 makes new tables utf8mb4_unicode_ci, so the existing ones must be too.
	const [collations] = await connection.query<RowDataPacket[]>(
		`select table_collation as collation, count(*) as count from information_schema.tables
		 where table_schema = database() and table_type = 'BASE TABLE' group by table_collation`
	);
	const others = collations.filter((row) => row.collation !== TABLE_COLLATION);
	if (others.length > 0) {
		const found = others.map((row) => `${row.count} ${row.collation}`).join(', ');
		throw new Error(
			`${name} has tables that are not ${TABLE_COLLATION} (${found}): ` +
				'fix migration 0001_database_collation before baselining'
		);
	}

	// Same definition as drizzle's MySQL migrator creates. The collation is explicit because 0001
	// (which fixes the database default) has not run yet.
	await connection.query(
		`create table if not exists \`${MIGRATIONS_TABLE}\` (
			id serial primary key,
			hash text not null,
			created_at bigint
		) collate ${TABLE_COLLATION}`
	);
	const [applied] = await connection.query<RowDataPacket[]>(
		`select count(*) as count from \`${MIGRATIONS_TABLE}\``
	);
	if (applied[0].count > 0) {
		throw new Error(`${name} is already baselined (${MIGRATIONS_TABLE} has rows)`);
	}

	await connection.query(`insert into \`${MIGRATIONS_TABLE}\` (hash, created_at) values (?, ?)`, [
		baseline.hash,
		baseline.folderMillis
	]);
	console.log(`${name}: marked as migrated up to the baseline.`);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
} finally {
	await connection.end();
}
