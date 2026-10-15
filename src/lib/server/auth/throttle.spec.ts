import { describe, expect, it } from 'vitest';
import { clearLoginFailures, isLoginThrottled, recordLoginFailure, throttleKey } from './throttle';

describe('login throttle', () => {
	it('locks after 5 failures within a minute and unlocks afterwards', () => {
		const key = throttleKey(' Admin@Example.com ', '127.0.0.1');
		expect(key).toBe('admin@example.com|127.0.0.1');

		const start = 1_000_000;
		for (let i = 0; i < 4; i++) recordLoginFailure(key, start + i);
		expect(isLoginThrottled(key, start + 10)).toBe(false);

		recordLoginFailure(key, start + 20);
		expect(isLoginThrottled(key, start + 30)).toBe(true);
		expect(isLoginThrottled(key, start + 60_021)).toBe(false);
	});

	it('is cleared by a successful login', () => {
		const key = throttleKey('someone@example.com', '10.0.0.1');
		for (let i = 0; i < 5; i++) recordLoginFailure(key);
		expect(isLoginThrottled(key)).toBe(true);
		clearLoginFailures(key);
		expect(isLoginThrottled(key)).toBe(false);
	});
});
