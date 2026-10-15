import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, isTimeZone } from './format';

describe('isTimeZone', () => {
	it('accepts IANA zones only', () => {
		expect(isTimeZone('Europe/Lisbon')).toBe(true);
		expect(isTimeZone('Atlantic/Azores')).toBe(true);
		expect(isTimeZone('Mars/Olympus')).toBe(false);
		expect(isTimeZone('')).toBe(false);
		expect(isTimeZone(undefined)).toBe(false);
	});
});

describe('formatDateTime', () => {
	it('shows a UTC instant in the admin timezone', () => {
		// 23:30 UTC in summer is 00:30 of the next day in Lisbon (UTC+1).
		const value = new Date('2025-07-14T23:30:00Z');
		expect(formatDateTime(value, { timeZone: 'Europe/Lisbon', locale: 'pt-PT' })).toBe(
			'15/07/25, 00:30'
		);
		expect(formatDateTime(value, { timeZone: 'Atlantic/Azores', locale: 'pt-PT' })).toBe(
			'14/07/25, 23:30'
		);
	});

	it('renders nothing for missing or invalid dates', () => {
		expect(formatDateTime(null, { timeZone: 'Europe/Lisbon', locale: 'pt-PT' })).toBe('');
		expect(formatDateTime('nope', { timeZone: 'Europe/Lisbon', locale: 'pt-PT' })).toBe('');
	});
});

describe('formatDate', () => {
	it('formats calendar dates without shifting the day', () => {
		expect(formatDate('1904-02-28', 'pt-PT')).toBe('28/02/1904');
		expect(formatDate(null, 'pt-PT')).toBe('');
	});
});
