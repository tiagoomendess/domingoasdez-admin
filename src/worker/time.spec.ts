import { describe, expect, it } from 'vitest';
import { siteDateTime, siteDay, siteEndOfDay } from './time.ts';

describe('site time (Lisbon)', () => {
	it('gives the Lisbon day', () => {
		// 23:30 UTC in summer is already the next day in Lisbon.
		expect(siteDay(new Date('2026-06-28T23:30:00Z'))).toBe('2026-06-29');
		expect(siteDay(new Date('2026-12-28T23:30:00Z'))).toBe('2026-12-28');
	});

	it('formats date and time as the legacy emails', () => {
		expect(siteDateTime(new Date('2026-07-05T21:59:00Z'))).toEqual({
			date: '05/07/2026',
			time: '22:59'
		});
	});

	it('ends the day at 23:59:59 Lisbon time, across DST changes', () => {
		// Summer (UTC+1).
		expect(siteEndOfDay(new Date('2026-07-05T10:00:00Z')).toISOString()).toBe(
			'2026-07-05T22:59:59.000Z'
		);
		// Tomorrow from Saturday 24 October 2026: Sunday 25th, after the switch to UTC+0.
		expect(siteEndOfDay(new Date('2026-10-24T10:00:00Z'), 1).toISOString()).toBe(
			'2026-10-25T23:59:59.000Z'
		);
		// Across a month end.
		expect(siteEndOfDay(new Date('2026-10-31T12:00:00Z'), 1).toISOString()).toBe(
			'2026-11-01T23:59:59.000Z'
		);
	});
});
