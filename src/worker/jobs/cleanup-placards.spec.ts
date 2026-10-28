import { describe, expect, it } from 'vitest';
import { cutoffs } from './cleanup-placards.rules.ts';

describe('cleanup-placards cutoffs', () => {
	it('forgets screens after 30 days and events after 180', () => {
		const { screens, events } = cutoffs(new Date('2026-10-28T04:30:00Z'));
		expect(screens.toISOString()).toBe('2026-09-28T04:30:00.000Z');
		expect(events.toISOString()).toBe('2026-05-01T04:30:00.000Z');
	});
});
