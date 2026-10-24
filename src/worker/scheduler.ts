import { Cron } from 'croner';
import type { PortedJob } from './job.ts';
import { runJob, type RunOptions } from './runner.ts';

export type Scheduler = {
	/**
	 * Stops scheduling, aborts the running jobs' signal and waits for them to return, at most
	 * `timeoutMs`. Resolves false when some were still running.
	 */
	stop(timeoutMs: number): Promise<boolean>;
};

/** One cron per job, in UTC; a tick is skipped while the job's previous run is still going. */
export function startScheduler(jobs: PortedJob[], options: Omit<RunOptions, 'signal'>): Scheduler {
	const controller = new AbortController();
	const running = new Set<Promise<unknown>>();

	const crons = jobs.map(
		(job) =>
			new Cron(
				job.schedule,
				{
					name: job.name,
					timezone: 'UTC',
					protect: () => options.log.child(job.name).warn('previous run still going, tick skipped')
				},
				async () => {
					const run = runJob(job, { ...options, signal: controller.signal });
					running.add(run);
					try {
						await run;
					} finally {
						running.delete(run);
					}
				}
			)
	);

	return {
		async stop(timeoutMs) {
			for (const cron of crons) cron.stop();
			controller.abort();
			if (running.size === 0) return true;

			let timer: NodeJS.Timeout | undefined;
			const timedOut = new Promise<false>((resolve) => {
				timer = setTimeout(() => resolve(false), timeoutMs);
			});
			const finished = Promise.allSettled([...running]).then(() => true as const);
			try {
				return await Promise.race([finished, timedOut]);
			} finally {
				clearTimeout(timer);
			}
		}
	};
}
