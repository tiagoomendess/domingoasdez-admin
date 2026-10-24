import { describe, expect, it, vi } from 'vitest';
import type { PortedJob } from './job.ts';
import { runJob } from './runner.ts';
import { recordingLogger } from './test-helpers.ts';

const job = (run: PortedJob['run']): PortedJob => ({
	name: 'test-job',
	legacy: 'TestJob',
	schedule: '* * * * *',
	run
});

const options = (lock: () => Promise<(() => Promise<void>) | null>) => ({
	log: recordingLogger(),
	dryRun: true,
	signal: new AbortController().signal,
	lock
});

describe('runJob', () => {
	it('runs under the lock and releases it', async () => {
		const release = vi.fn(async () => {});
		const run = vi.fn(async () => {});
		const opts = options(async () => release);

		expect(await runJob(job(run), opts)).toBe('done');
		expect(run).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
		expect(release).toHaveBeenCalledOnce();
	});

	it('skips the run when another process holds the lock', async () => {
		const run = vi.fn(async () => {});
		const opts = options(async () => null);

		expect(await runJob(job(run), opts)).toBe('skipped');
		expect(run).not.toHaveBeenCalled();
		expect(opts.log.lines).toContain(
			'warn: [test-job] already running in another process, skipped'
		);
	});

	it('logs a failing run, releases the lock and does not throw', async () => {
		const release = vi.fn(async () => {});
		const opts = options(async () => release);

		const outcome = await runJob(
			job(async () => {
				throw new Error('boom');
			}),
			opts
		);

		expect(outcome).toBe('failed');
		expect(release).toHaveBeenCalledOnce();
		expect(opts.log.lines.some((line) => line.startsWith('error: [test-job] failed after'))).toBe(
			true
		);
	});

	it('fails without running when the lock cannot be taken', async () => {
		const run = vi.fn(async () => {});
		const opts = options(async () => {
			throw new Error('database down');
		});

		expect(await runJob(job(run), opts)).toBe('failed');
		expect(run).not.toHaveBeenCalled();
	});
});
