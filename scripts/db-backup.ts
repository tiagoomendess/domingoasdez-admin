// `npm run db:backup -- [dir]`: gzipped `mysqldump --single-transaction` of the database
// (MIGRATION_DATABASE_URL, else DATABASE_URL) into `dir` (default ./backups), keeping the newest
// KEEP dumps. scripts/deploy.sh runs it before applying migrations. Needs `mysqldump` on the PATH.
import { spawn } from 'node:child_process';
import {
	createWriteStream,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	renameSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

const KEEP = 5;

if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL is not set');

const { hostname, port, username, password, pathname } = new URL(url);
const database = decodeURIComponent(pathname.slice(1));
const dir = resolve(process.argv[2] ?? 'backups');
mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
const file = join(dir, `${database}-${stamp}.sql.gz`);

// Credentials go in an option file, not on the command line where `ps` would show them.
const quote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const secrets = mkdtempSync(join(tmpdir(), 'db-backup-'));
const options = join(secrets, 'my.cnf');
writeFileSync(
	options,
	[
		'[client]',
		`host=${quote(hostname)}`,
		`port=${port || '3306'}`,
		`user=${quote(decodeURIComponent(username))}`,
		`password=${quote(decodeURIComponent(password))}`,
		''
	].join('\n'),
	{ mode: 0o600 }
);

try {
	const dump = spawn(
		'mysqldump',
		[
			`--defaults-extra-file=${options}`,
			'--single-transaction',
			'--quick',
			'--no-tablespaces',
			'--default-character-set=utf8mb4',
			database
		],
		{ stdio: ['ignore', 'pipe', 'inherit'] }
	);
	const exited = new Promise<number>((done, fail) => {
		dump.on('error', fail);
		dump.on('close', (code) => done(code ?? 1));
	});
	// Awaited together: a spawn error (no mysqldump) must land in the catch below.
	const [code] = await Promise.all([
		exited,
		pipeline(dump.stdout, createGzip(), createWriteStream(`${file}.partial`))
	]);
	if (code !== 0) throw new Error(`mysqldump exited with code ${code}`);
	renameSync(`${file}.partial`, file);
	console.log(file);

	const dumps = readdirSync(dir)
		.filter((name) => name.startsWith(`${database}-`) && name.endsWith('.sql.gz'))
		.sort()
		.reverse();
	for (const old of dumps.slice(KEEP)) rmSync(join(dir, old));
} catch (error) {
	rmSync(`${file}.partial`, { force: true });
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
} finally {
	rmSync(secrets, { recursive: true, force: true });
}
