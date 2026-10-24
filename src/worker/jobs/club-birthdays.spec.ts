import { describe, expect, it } from 'vitest';
import { birthdayAge, birthdayPostText } from './club-birthdays.rules.ts';

describe('birthdayAge', () => {
	it('counts the years on the founding day and month', () => {
		expect(birthdayAge('1973-08-15', '2026-08-15')).toBe(53);
	});

	it('is null on any other day', () => {
		expect(birthdayAge('1973-08-15', '2026-08-16')).toBeNull();
		expect(birthdayAge('1973-08-15', '2026-09-15')).toBeNull();
	});

	it('only celebrates 29 February in leap years', () => {
		expect(birthdayAge('1980-02-29', '2028-02-29')).toBe(48);
		expect(birthdayAge('1980-02-29', '2027-02-28')).toBeNull();
	});
});

describe('birthdayPostText', () => {
	it('is the legacy caption', () => {
		expect(birthdayPostText('Fafe', 53)).toBe(
			'Parabéns Fafe! 🎂🎉 Hoje celebram 53 anos de história!'
		);
	});
});
