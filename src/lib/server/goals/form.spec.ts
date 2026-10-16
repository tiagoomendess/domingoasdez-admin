import { describe, expect, it } from 'vitest';
import { goalFormSchema, isOwnGoal } from './form';

describe('isOwnGoal', () => {
	it('is an own goal when the player plays for the opposing team of the game', () => {
		expect(isOwnGoal({ ownGoal: false, playerTeamId: 9, opposingTeamId: 9 })).toBe(true);
	});

	it('keeps the admin choice otherwise (legacy flipped goals of transferred players)', () => {
		expect(isOwnGoal({ ownGoal: false, playerTeamId: 3, opposingTeamId: 9 })).toBe(false);
		expect(isOwnGoal({ ownGoal: false, playerTeamId: null, opposingTeamId: 9 })).toBe(false);
		expect(isOwnGoal({ ownGoal: true, playerTeamId: 3, opposingTeamId: 9 })).toBe(true);
	});
});

describe('goalFormSchema', () => {
	const valid = { game_id: '5', side: 'home', visible: 'on' };

	it('accepts a goal without player or minute', () => {
		const data = goalFormSchema.parse(valid);
		expect(data).toMatchObject({ player_id: null, minute: null, penalty: false, visible: true });
	});

	it('keeps the legacy minute range and the two sides', () => {
		expect(goalFormSchema.safeParse({ ...valid, minute: '0' }).success).toBe(false);
		expect(goalFormSchema.safeParse({ ...valid, minute: '141' }).success).toBe(false);
		expect(goalFormSchema.safeParse({ ...valid, side: 'neutral' }).success).toBe(false);
	});
});
