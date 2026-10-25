import type { Logger } from '#lib/server/logger.ts';

export type JobContext = {
	/** Aborted when the worker shuts down: stop between items and leave the rest for the next run. */
	signal: AbortSignal;
	log: Logger;
	/** WORKER_DRY_RUN: log the mail and social media posts instead of sending them. */
	dryRun: boolean;
};

export type JobDefinition = {
	/** kebab-case: the WORKER_JOBS entry, the CLI argument and the lock name. */
	name: string;
	/** The legacy `App\Jobs\...` class it replaces. */
	legacy: string;
	/** Cron expression in UTC, the legacy Kernel's times (Laravel runs in UTC). */
	schedule: string;
	/** Missing until the job is ported: it can't be enabled or run. */
	run?: (context: JobContext) => Promise<void>;
};

export type PortedJob = JobDefinition & { run: NonNullable<JobDefinition['run']> };

export function isPorted(job: JobDefinition): job is PortedJob {
	return job.run !== undefined;
}
