import type { PortedJob } from './job.ts';
import type { ReleaseLock } from './lock.ts';
import type { Logger } from './log.ts';

export type RunOptions = {
	log: Logger;
	dryRun: boolean;
	signal: AbortSignal;
	/** `acquireJobLock` in the worker; injected so the runner is testable without a database. */
	lock: (job: string) => Promise<ReleaseLock | null>;
};

export type RunOutcome = 'done' | 'failed' | 'skipped';

/**
 * One run of a job under its lock. Never throws: a failing run is logged and the next tick tries
 * again, as the legacy scheduler did.
 */
export async function runJob(job: PortedJob, options: RunOptions): Promise<RunOutcome> {
	const log = options.log.child(job.name);

	let release: ReleaseLock | null;
	try {
		release = await options.lock(job.name);
	} catch (error) {
		log.error('could not take the job lock', error);
		return 'failed';
	}
	if (!release) {
		log.warn('already running in another process, skipped');
		return 'skipped';
	}

	const started = performance.now();
	const elapsed = () => `${Math.round(performance.now() - started)} ms`;
	let outcome: RunOutcome = 'done';
	try {
		log.debug('started');
		await job.run({ signal: options.signal, log, dryRun: options.dryRun });
		log.debug(`finished in ${elapsed()}`);
	} catch (error) {
		outcome = 'failed';
		log.error(`failed after ${elapsed()}`, error);
	} finally {
		try {
			await release();
		} catch (error) {
			log.warn('could not release the job lock', error);
		}
	}
	return outcome;
}
