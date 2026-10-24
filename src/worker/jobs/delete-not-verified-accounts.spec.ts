import { describe, expect, it } from 'vitest';
import { unverifiedCutoff } from './delete-not-verified-accounts.ts';

describe('unverifiedCutoff', () => {
	it('is 15 minutes before now', () => {
		expect(unverifiedCutoff(new Date('2026-10-25T10:00:00Z')).toISOString()).toBe(
			'2026-10-25T09:45:00.000Z'
		);
	});
});
