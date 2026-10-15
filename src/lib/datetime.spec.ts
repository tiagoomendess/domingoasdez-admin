import { describe, expect, it } from 'vitest';
import { fromLocalInput, isLocalDateTime, toLocalInput } from './datetime';

describe('datetime-local values', () => {
	it('reads a summer time in Lisbon as UTC+1', () => {
		expect(fromLocalInput('2026-07-10T21:30', 'Europe/Lisbon')?.toISOString()).toBe(
			'2026-07-10T20:30:00.000Z'
		);
	});

	it('reads a winter time in Lisbon as UTC', () => {
		expect(fromLocalInput('2026-01-10T21:30', 'Europe/Lisbon')?.toISOString()).toBe(
			'2026-01-10T21:30:00.000Z'
		);
	});

	it('handles other offsets and accepts seconds', () => {
		expect(fromLocalInput('2026-01-10T09:00:00', 'Asia/Tokyo')?.toISOString()).toBe(
			'2026-01-10T00:00:00.000Z'
		);
	});

	it('moves a time skipped by DST forward', () => {
		expect(fromLocalInput('2026-03-29T01:30', 'Europe/Lisbon')?.toISOString()).toBe(
			'2026-03-29T01:30:00.000Z'
		);
	});

	it('rejects invalid values', () => {
		expect(fromLocalInput('2026-02-30T10:00', 'Europe/Lisbon')).toBeNull();
		expect(fromLocalInput('2026-02-10 10:00', 'Europe/Lisbon')).toBeNull();
		expect(fromLocalInput('2026-02-10T24:00', 'Europe/Lisbon')).toBeNull();
		expect(isLocalDateTime('10/02/2026')).toBe(false);
	});

	it('writes a UTC instant in the admin timezone', () => {
		expect(toLocalInput(new Date('2026-07-10T20:30:00Z'), 'Europe/Lisbon')).toBe(
			'2026-07-10T21:30'
		);
		expect(toLocalInput(new Date('2026-01-10T23:30:00Z'), 'Europe/Lisbon')).toBe(
			'2026-01-10T23:30'
		);
	});

	it('round-trips', () => {
		const value = '2026-10-25T00:15';
		const instant = fromLocalInput(value, 'America/Sao_Paulo');
		expect(instant && toLocalInput(instant, 'America/Sao_Paulo')).toBe(value);
	});
});
