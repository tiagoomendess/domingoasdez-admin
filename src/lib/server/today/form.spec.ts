import { describe, expect, it } from 'vitest';
import {
	accuracyLevel,
	dayRange,
	groupByCompetition,
	localDay,
	reportedScores,
	reportStatusSchema,
	scoreFormSchema,
	shiftDay,
	statusFlags
} from './form';

describe('scoreFormSchema', () => {
	it('reads a score', () => {
		const result = scoreFormSchema.safeParse({
			game_id: '12',
			goals_home: '2',
			goals_away: '0',
			finished: 'on'
		});
		expect(result.success && result.data).toEqual({
			game_id: 12,
			goals_home: 2,
			goals_away: 0,
			finished: true
		});
	});

	it('refuses impossible scores', () => {
		const base = { game_id: '12', goals_home: '1', goals_away: '1' };
		expect(scoreFormSchema.safeParse({ ...base, goals_home: '-1' }).success).toBe(false);
		expect(scoreFormSchema.safeParse({ ...base, goals_away: '100' }).success).toBe(false);
		expect(scoreFormSchema.safeParse({ ...base, game_id: '' }).success).toBe(false);
	});
});

describe('days', () => {
	it('reads the day in the admin timezone', () => {
		// 23:30 UTC in summer is already the next day in Lisbon.
		expect(localDay(new Date('2026-07-04T23:30:00Z'), 'Europe/Lisbon')).toBe('2026-07-05');
		expect(localDay(new Date('2026-07-04T22:30:00Z'), 'Europe/Lisbon')).toBe('2026-07-04');
	});

	it('moves across months and years', () => {
		expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
		expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
	});

	it('gives the UTC range of a local day', () => {
		expect(dayRange('2026-07-05', 'Europe/Lisbon')).toEqual({
			start: new Date('2026-07-04T23:00:00Z'),
			end: new Date('2026-07-05T23:00:00Z')
		});
		expect(dayRange('05/07/2026', 'Europe/Lisbon')).toBeNull();
	});
});

describe('reportedScores', () => {
	it('counts the latest reports like the legacy page', () => {
		const reports = ['1-0', '1-0', '2-0', '1-0'].map((s) => {
			const [homeScore, awayScore] = s.split('-').map(Number);
			return { homeScore, awayScore };
		});
		expect(reportedScores(reports)).toEqual([
			{ score: '1-0', count: 3 },
			{ score: '2-0', count: 1 }
		]);
	});

	it('stops at 5 different scores', () => {
		const reports = [0, 1, 2, 3, 4, 5, 0].map((n) => ({ homeScore: n, awayScore: 0 }));
		expect(reportedScores(reports).map((r) => r.score)).toEqual([
			'0-0',
			'1-0',
			'2-0',
			'3-0',
			'4-0'
		]);
	});
});

describe('groupByCompetition', () => {
	it('keeps the game order and starts a section per competition', () => {
		const game = (id: number, competitionId: number) => ({
			id,
			competitionId,
			competitionName: `C${competitionId}`,
			competitionPicture: null
		});
		const sections = groupByCompetition([game(1, 7), game(2, 7), game(3, 2)]);
		expect(sections.map((s) => [s.id, s.games.map((g) => g.id)])).toEqual([
			[7, [1, 2]],
			[2, [3]]
		]);
	});
});

describe('accuracyLevel', () => {
	it('uses the legacy thresholds', () => {
		expect([10, 50, 99, 249, 599, 600].map(accuracyLevel)).toEqual([
			'best',
			'good',
			'good',
			'fair',
			'poor',
			'bad'
		]);
		expect(accuracyLevel(null)).toBeNull();
	});
});

describe('reportStatusSchema / statusFlags', () => {
	it('accepts the legacy statuses only', () => {
		expect(reportStatusSchema.safeParse({ status: 'fake' }).success).toBe(true);
		expect(reportStatusSchema.safeParse({ status: 'deleted' }).success).toBe(false);
		expect(reportStatusSchema.safeParse(null).success).toBe(false);
	});

	it('never sets both flags', () => {
		expect(statusFlags('fake')).toEqual({ isFake: true, isCorrect: false });
		expect(statusFlags('correct')).toEqual({ isFake: false, isCorrect: true });
		expect(statusFlags('unknown')).toEqual({ isFake: false, isCorrect: false });
	});
});
