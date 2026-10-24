// Background jobs worker (docs/jobs.md). Bundled by vite.worker.config.ts into build/worker and
// run by PM2 as domingoasdez-admin-worker:
//
//   node build/worker/index.js             start the scheduler
//   node build/worker/index.js list        jobs, schedule, ported, enabled
//   node build/worker/index.js run <job>   run one job now and exit
import { writeFile } from 'node:fs/promises';
import { WORKER_DRY_RUN, WORKER_JOBS, WORKER_LOG_LEVEL } from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { isPorted } from './job.ts';
import { findJob, jobs, selectJobs } from './jobs/index.ts';
import { acquireJobLock } from './lock.ts';
import { createLogger } from './log.ts';
import { runJob } from './runner.ts';
import { startScheduler } from './scheduler.ts';

/** scripts/deploy.sh waits for a heartbeat from the new PID (PM2 runs the worker from the repo root). */
const HEARTBEAT_FILE = '.worker-heartbeat';
const HEARTBEAT_INTERVAL_MS = 30_000;
/** Below PM2's kill_timeout (ecosystem.config.cjs), so the worker exits on its own terms. */
const SHUTDOWN_TIMEOUT_MS = 50_000;

const log = createLogger(WORKER_LOG_LEVEL);

function list() {
	const enabled = new Set(safeSelection().map((job) => job.name));
	console.table(
		jobs.map((job) => ({
			job: job.name,
			legacy: job.legacy,
			'cron (UTC)': job.schedule,
			ported: isPorted(job) ? 'yes' : 'no',
			enabled: enabled.has(job.name) ? 'yes' : 'no'
		}))
	);
}

function safeSelection() {
	try {
		return selectJobs(WORKER_JOBS);
	} catch (error) {
		log.warn(`${error instanceof Error ? error.message : error}: the scheduler would not start`);
		return [];
	}
}

async function runOnce(name: string | undefined) {
	const job = name ? findJob(name) : undefined;
	if (!job) throw new Error(`Unknown job "${name ?? ''}". Usage: run <job> (see list)`);
	if (!isPorted(job)) throw new Error(`"${job.name}" is not ported yet`);
	if (WORKER_DRY_RUN) log.info('dry run (WORKER_DRY_RUN): mail and social posts are only logged');

	const controller = new AbortController();
	process.once('SIGINT', () => controller.abort());
	const outcome = await runJob(job, {
		log,
		dryRun: WORKER_DRY_RUN,
		signal: controller.signal,
		lock: acquireJobLock
	});
	log.info(`${job.name}: ${outcome}`);
	if (outcome !== 'done') process.exitCode = 1;
}

async function start(): Promise<true> {
	const selected = selectJobs(WORKER_JOBS);

	// Fail fast (PM2 shows the restart loop, the deploy sees no heartbeat) when MySQL is unreachable.
	await db.$client.query('SELECT 1');

	if (WORKER_DRY_RUN) log.warn('dry run (WORKER_DRY_RUN): mail and social posts are only logged');
	log.info(
		selected.length > 0
			? `scheduling ${selected.map((job) => `${job.name} (${job.schedule})`).join(', ')}`
			: 'no jobs enabled (WORKER_JOBS), idle'
	);

	const scheduler = startScheduler(selected, {
		log,
		dryRun: WORKER_DRY_RUN,
		lock: acquireJobLock
	});

	const beat = () =>
		writeFile(
			HEARTBEAT_FILE,
			JSON.stringify({ pid: process.pid, at: new Date().toISOString() })
		).catch((error) => log.warn(`could not write ${HEARTBEAT_FILE}`, error));
	await beat();
	const heartbeat = setInterval(beat, HEARTBEAT_INTERVAL_MS);

	let stopping = false;
	const shutdown = async (signal: string) => {
		if (stopping) return;
		stopping = true;
		log.info(`${signal}: stopping, waiting for running jobs`);
		clearInterval(heartbeat);
		const finished = await scheduler.stop(SHUTDOWN_TIMEOUT_MS);
		if (!finished) log.warn('jobs still running after the shutdown timeout, exiting anyway');
		await db.$client.end().catch(() => {});
		process.exit(finished ? 0 : 1);
	};
	process.once('SIGINT', () => void shutdown('SIGINT'));
	process.once('SIGTERM', () => void shutdown('SIGTERM'));
	return true;
}

const [command = 'start', ...args] = process.argv.slice(2);

let scheduling = false;
try {
	if (command === 'start') scheduling = await start();
	else if (command === 'list') list();
	else if (command === 'run') await runOnce(args[0]);
	else throw new Error(`Unknown command "${command}". Commands: start (default), list, run <job>`);
} catch (error) {
	log.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
// The scheduler keeps the pool; one-off commands and a failed start close it so the process exits.
if (!scheduling) await db.$client.end().catch(() => {});
