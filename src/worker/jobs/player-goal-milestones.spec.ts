import { describe, expect, it } from 'vitest';
import {
	ageSafePicture,
	DEFAULT_PROFILE_PICTURE,
	displayName,
	firstAndLastName,
	milestoneKey,
	milestonePostText,
	playerAge,
	reachedMilestone
} from './player-goal-milestones.rules.ts';

describe('reachedMilestone', () => {
	it('counts a milestone up to 3 goals after it', () => {
		expect(reachedMilestone(49)).toBeNull();
		expect(reachedMilestone(50)).toBe(50);
		expect(reachedMilestone(53)).toBe(50);
		expect(reachedMilestone(54)).toBeNull();
		expect(reachedMilestone(102)).toBe(100);
		expect(reachedMilestone(300)).toBe(300);
		expect(reachedMilestone(304)).toBeNull();
	});
});

describe('milestoneKey', () => {
	it('is the legacy key, within the 36-character column', () => {
		expect(milestoneKey(1472, 100)).toBe('player_1472_goal_posted_100');
		expect(milestoneKey(9_999_999, 300).length).toBeLessThanOrEqual(36);
	});
});

describe('names', () => {
	it('keeps the first and last words, like legacy', () => {
		expect(firstAndLastName('João Pedro Silva Costa')).toBe('João Costa');
		expect(firstAndLastName('Zé')).toBe('Zé');
		expect(firstAndLastName(null)).toBe('');
		// PHP explode keeps empty parts: a trailing space leaves an empty last name.
		expect(firstAndLastName('Ana Silva ')).toBe('Ana ');
	});

	it('adds the nickname', () => {
		expect(displayName('João Pedro Costa', 'Jota')).toBe('João Costa (Jota)');
		expect(displayName('João Costa', null)).toBe('João Costa');
	});
});

describe('ageSafePicture', () => {
	const now = new Date('2026-10-24T05:00:00Z');

	it('shows the photo from 18', () => {
		expect(playerAge('2008-10-24 00:00:00', now)).toBe(18);
		expect(playerAge('2008-10-25 00:00:00', now)).toBe(17);
		expect(
			ageSafePicture({ picture: '/storage/p.jpg', birthDate: '2008-10-24 00:00:00' }, now)
		).toBe('/storage/p.jpg');
	});

	it('uses the default picture under 18, without a birth date or a photo', () => {
		const adult = '1990-01-01 00:00:00';
		expect(
			ageSafePicture({ picture: '/storage/p.jpg', birthDate: '2009-01-01 00:00:00' }, now)
		).toBe(DEFAULT_PROFILE_PICTURE);
		expect(ageSafePicture({ picture: '/storage/p.jpg', birthDate: null }, now)).toBe(
			DEFAULT_PROFILE_PICTURE
		);
		expect(ageSafePicture({ picture: null, birthDate: adult }, now)).toBe(DEFAULT_PROFILE_PICTURE);
	});
});

describe('milestonePostText', () => {
	it('is the legacy caption', () => {
		expect(milestonePostText('João Costa (Jota)', 'Fafe', 100)).toBe(
			'⚽ João Costa (Jota) do Fafe atingiu a marca dos 100 golos! Parabéns! 🎉'
		);
		expect(milestonePostText('João Costa', null, 50)).toBe(
			'⚽ João Costa atingiu a marca dos 50 golos! Parabéns! 🎉'
		);
	});
});
