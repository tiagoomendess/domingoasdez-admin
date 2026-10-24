import { describe, expect, it } from 'vitest';
import { gameScore } from './score';

const game = { id: 7, homeTeamId: 1, awayTeamId: 2 };

describe('gameScore', () => {
	it('uses the typed score', () => {
		const counts = new Map([['7:1', 5]]);
		expect(gameScore({ ...game, goalsHome: 2, goalsAway: 0 }, counts)).toEqual({
			home: 2,
			away: 0
		});
	});

	it('counts the goals of each team when the score is empty', () => {
		const counts = new Map([
			['7:1', 3],
			['8:2', 9]
		]);
		expect(gameScore({ ...game, goalsHome: null, goalsAway: null }, counts)).toEqual({
			home: 3,
			away: 0
		});
	});

	it('falls back per side', () => {
		const counts = new Map([['7:2', 1]]);
		expect(gameScore({ ...game, goalsHome: 4, goalsAway: null }, counts)).toEqual({
			home: 4,
			away: 1
		});
	});
});
