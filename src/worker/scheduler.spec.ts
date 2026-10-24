import { describe, expect, it } from 'vitest';
import type { PortedJob } from './job.ts';
import { startScheduler } from './scheduler.ts';
import { recordingLogger } from './test-helpers.ts';

const lock = async () => async () => {};

describe('startScheduler', () => {
	it('runs jobs on their schedule and waits for a running job on stop', async () => {
		let started = 0;
		let aborted = false;
		const job: PortedJob = {
			name: 'every-second',
			legacy: 'EverySecond',
			// croner accepts a seconds field; the registry only uses minute schedules.
			schedule: '* * * * * *',
			run: ({ signal }) =>
				new Promise((resolve) => {
					started++;
					signal.addEventListener('abort', () => {
						aborted = true;
						resolve();
					});
				})
		};

		const scheduler = startScheduler([job], { log: recordingLogger(), dryRun: true, lock });
		await expect.poll(() => started, { timeout: 2500 }).toBe(1);

		expect(await scheduler.stop(1000)).toBe(true);
		expect(aborted).toBe(true);
	});

	it('gives up waiting after the timeout', async () => {
		let started = false;
		const job: PortedJob = {
			name: 'stuck',
			legacy: 'Stuck',
			schedule: '* * * * * *',
			run: () => {
				started = true;
				return new Promise(() => {});
			}
		};

		const scheduler = startScheduler([job], { log: recordingLogger(), dryRun: true, lock });
		await expect.poll(() => started, { timeout: 2500 }).toBe(true);

		expect(await scheduler.stop(20)).toBe(false);
	});
});
