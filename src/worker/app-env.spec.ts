import { describe, expect, it } from 'vitest';
import { readAppEnv } from './app-env.ts';

const valid = {
	DATABASE_URL: 'mysql://user:pass@localhost:3306/dad_db',
	SESSION_SECRET: 'x'.repeat(32)
};

describe('readAppEnv', () => {
	it('applies the src/env.ts schemas and defaults', () => {
		const env = readAppEnv(valid);
		expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
		expect(env.R2_REGION).toBe('auto');
		expect(env.WORKER_JOBS).toEqual([]);
		expect(env.WORKER_DRY_RUN).toBe(true);
		expect(env.WORKER_LOG_LEVEL).toBe('info');
	});

	it('parses the worker switches', () => {
		const env = readAppEnv({
			...valid,
			WORKER_JOBS: ' process-polls, generate-game-image ,',
			WORKER_DRY_RUN: 'false',
			WORKER_LOG_LEVEL: 'DEBUG'
		});
		expect(env.WORKER_JOBS).toEqual(['process-polls', 'generate-game-image']);
		expect(env.WORKER_DRY_RUN).toBe(false);
		expect(env.WORKER_LOG_LEVEL).toBe('debug');
		expect(readAppEnv({ ...valid, WORKER_JOBS: 'all' }).WORKER_JOBS).toBe('all');
	});

	it('lists every invalid variable', () => {
		expect(() => readAppEnv({ SESSION_SECRET: 'short', WORKER_DRY_RUN: 'maybe' })).toThrow(
			/DATABASE_URL: Must be a mysql:\/\/ URL\n {2}SESSION_SECRET: .*\n {2}WORKER_DRY_RUN: Must be true or false/
		);
	});
});
