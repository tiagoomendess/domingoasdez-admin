import { Cron } from 'croner';
import { describe, expect, it } from 'vitest';
import type { JobDefinition } from '../job.ts';
import { jobLockName } from '../lock.ts';
import { jobs, selectJobs } from './index.ts';

describe('job registry', () => {
	it('has unique kebab-case names', () => {
		const names = jobs.map((job) => job.name);
		expect(new Set(names).size).toBe(names.length);
		for (const name of names) expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
	});

	it('keeps lock names within the MySQL limit', () => {
		for (const job of jobs) expect(jobLockName(job.name).length).toBeLessThanOrEqual(64);
	});

	it('has valid cron schedules (UTC, like the legacy Kernel)', () => {
		for (const job of jobs) {
			const cron = new Cron(job.schedule, { paused: true, timezone: 'UTC' });
			expect(cron.nextRun(), job.name).toBeInstanceOf(Date);
		}
	});

	it('runs dailyAt jobs at the legacy UTC times', () => {
		const next = (name: string) => {
			const job = jobs.find((entry) => entry.name === name)!;
			return new Cron(job.schedule, { paused: true, timezone: 'UTC' })
				.nextRun(new Date('2026-07-05T00:00:00Z'))
				?.toISOString();
		};
		expect(next('schedule-social-media')).toBe('2026-07-05T05:15:00.000Z');
		expect(next('process-score-report-bans')).toBe('2026-07-05T22:59:00.000Z');
	});
});

describe('selectJobs', () => {
	const run = async () => {};
	const registry: JobDefinition[] = [
		{ name: 'ported-a', legacy: 'A', schedule: '* * * * *', run },
		{ name: 'ported-b', legacy: 'B', schedule: '0 1 * * *', run },
		{ name: 'pending', legacy: 'C', schedule: '0 2 * * *' }
	];

	it('selects nothing by default', () => {
		expect(selectJobs([], registry)).toEqual([]);
	});

	it('selects every ported job for "all"', () => {
		expect(selectJobs('all', registry).map((job) => job.name)).toEqual(['ported-a', 'ported-b']);
	});

	it('selects named jobs once', () => {
		expect(selectJobs(['ported-b', 'ported-b'], registry).map((job) => job.name)).toEqual([
			'ported-b'
		]);
	});

	it('refuses unknown and unported jobs', () => {
		expect(() => selectJobs(['typo'], registry)).toThrow(/unknown job "typo"/);
		expect(() => selectJobs(['pending'], registry)).toThrow(/not ported/);
	});
});
