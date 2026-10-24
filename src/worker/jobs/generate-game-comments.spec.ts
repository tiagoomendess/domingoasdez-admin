import { describe, expect, it } from 'vitest';
import {
	flashInterviewUrls,
	generatePin,
	notificationEmail
} from './generate-game-comments.rules.ts';

describe('notificationEmail', () => {
	it('prefers the team, then the club, then the club admin', () => {
		const all = { team: 'team@x.test', club: 'club@x.test', clubAdmin: 'admin@x.test' };
		expect(notificationEmail(all)).toBe('team@x.test');
		expect(notificationEmail({ ...all, team: null })).toBe('club@x.test');
		expect(notificationEmail({ ...all, team: ' ', club: '' })).toBe('admin@x.test');
		expect(notificationEmail({ team: null, club: null, clubAdmin: null })).toBeNull();
	});
});

describe('generatePin', () => {
	it('makes 4 digits, keeping leading zeros', () => {
		const digits = [0, 0, 4, 7];
		expect(generatePin(() => digits.shift()!)).toBe('0047');
	});
});

describe('flashInterviewUrls', () => {
	it('links to the public flash interview pages with the PIN', () => {
		expect(flashInterviewUrls('https://domingoasdez.com/', 'abc-123', '0427')).toEqual({
			action: 'https://domingoasdez.com/flash-interview/abc-123?pin=0427',
			unsubscribe: 'https://domingoasdez.com/flash-interview/abc-123/manage-notifications?pin=0427'
		});
	});
});
