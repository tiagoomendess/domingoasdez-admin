import { describe, expect, it } from 'vitest';
import { randomToken } from './token';

describe('randomToken', () => {
	it('makes letters and digits of the asked length', () => {
		expect(randomToken()).toMatch(/^[A-Za-z0-9]{32}$/);
		expect(randomToken(48)).toHaveLength(48);
	});

	it('differs every time', () => {
		expect(randomToken()).not.toBe(randomToken());
	});
});
