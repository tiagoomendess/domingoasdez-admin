import { describe, expect, it } from 'vitest';
import {
	decideScore,
	distanceMetres,
	isLive,
	reportPoints,
	tallyScores,
	utcDay,
	type ConsumerReport,
	type ScoreTally
} from './score-report-consumer.rules.ts';

const playground = { lat: 41.45, lng: -8.17 };
/** About `metres` north of the playground (1° of latitude ≈ 111 195 m). */
const north = (metres: number) => ({ lat: playground.lat + metres / 111_195, lng: playground.lng });

let nextId = 1;
const report = (overrides: Partial<ConsumerReport> = {}): ConsumerReport => ({
	id: nextId++,
	homeScore: 1,
	awayScore: 0,
	finished: false,
	source: 'website',
	userId: null,
	location: null,
	accuracy: null,
	...overrides
});

const tally = (key: string, points: number): ScoreTally => {
	const [home, away, finished] = key.split('-');
	return { key, home: +home, away: +away, finished: finished === 'true', points, reports: 1 };
};

describe('distanceMetres', () => {
	it('measures the great-circle distance', () => {
		expect(distanceMetres(playground, north(100))).toBeCloseTo(100, 0);
		expect(distanceMetres(playground, playground)).toBe(0);
	});
});

describe('reportPoints', () => {
	it('gives 1 to an anonymous report without location', () => {
		expect(reportPoints(report(), playground)).toBe(1);
	});

	it('adds 1 for a location and 1 more when accurate and near the playground', () => {
		expect(reportPoints(report({ location: north(5000), accuracy: 20 }), playground)).toBe(2);
		expect(reportPoints(report({ location: north(100), accuracy: 20 }), playground)).toBe(3);
		expect(reportPoints(report({ location: north(150), accuracy: 400 }), playground)).toBe(3);
	});

	it('gives no distance point when inaccurate, too far, too close or without accuracy', () => {
		expect(reportPoints(report({ location: north(100), accuracy: 401 }), playground)).toBe(2);
		expect(reportPoints(report({ location: north(151), accuracy: 20 }), playground)).toBe(2);
		expect(reportPoints(report({ location: playground, accuracy: 20 }), playground)).toBe(2);
		expect(reportPoints(report({ location: north(100), accuracy: null }), playground)).toBe(2);
		// Legacy cast the accuracy to an integer and treated 0 as missing.
		expect(reportPoints(report({ location: north(100), accuracy: 0.6 }), playground)).toBe(2);
	});

	it('gives no distance point when the game has no playground (legacy crashed)', () => {
		expect(reportPoints(report({ location: north(100), accuracy: 20 }), null)).toBe(2);
	});

	it('adds 1 for a signed-in user and 4 for the AFPB crawler', () => {
		expect(reportPoints(report({ userId: 12 }), playground)).toBe(2);
		expect(reportPoints(report({ source: 'api_afpb_crawler' }), playground)).toBe(5);
	});
});

describe('tallyScores', () => {
	it('groups by score and finished, in the order first reported', () => {
		const tallies = tallyScores(
			[
				report({ homeScore: 2, awayScore: 1 }),
				report({ homeScore: 1, awayScore: 1 }),
				report({ homeScore: 2, awayScore: 1, userId: 3 }),
				report({ homeScore: 2, awayScore: 1, finished: true })
			],
			playground
		);
		expect(tallies.map((t) => [t.key, t.points, t.reports])).toEqual([
			['2-1-false', 3, 2],
			['1-1-false', 1, 1],
			['2-1-true', 1, 1]
		]);
	});

	it('adds 1 when two sources agree and 2 for three or more', () => {
		const two = tallyScores([report(), report({ source: 'app' })], playground);
		expect(two[0].points).toBe(3);
		const three = tallyScores(
			[report(), report({ source: 'app' }), report({ source: 'admin' }), report()],
			playground
		);
		expect(three[0].points).toBe(6);
	});
});

describe('decideScore', () => {
	it('does nothing without reports', () => {
		expect(decideScore([]).tally).toBeNull();
	});

	it('applies a single score above 4 points', () => {
		expect(decideScore([tally('1-0-false', 5)]).tally?.key).toBe('1-0-false');
		expect(decideScore([tally('1-0-false', 4)]).tally).toBeNull();
	});

	it('applies the best of two when it has twice the points of the other and at least 4', () => {
		expect(decideScore([tally('1-0-false', 2), tally('2-0-false', 5)]).tally?.key).toBe(
			'2-0-false'
		);
		// Half of the best must be more than the other (the lowest is the second here).
		expect(decideScore([tally('1-0-false', 8), tally('2-0-false', 4)]).tally).toBeNull();
		expect(decideScore([tally('1-0-false', 3), tally('2-0-false', 1)]).tally).toBeNull();
	});

	it('applies the best of three under the same rules', () => {
		expect(
			decideScore([tally('1-0-false', 9), tally('2-0-false', 4), tally('0-0-false', 1)]).tally?.key
		).toBe('1-0-false');
		expect(
			decideScore([tally('1-0-false', 7), tally('2-0-false', 4), tally('0-0-false', 1)]).tally
		).toBeNull();
	});

	it('never applies a tie', () => {
		expect(decideScore([tally('1-0-false', 6), tally('2-0-false', 6)]).tally).toBeNull();
	});

	it('does nothing with four or more competing scores', () => {
		const tallies = ['1-0', '2-0', '3-0', '4-0'].map((score, i) =>
			tally(`${score}-false`, i === 0 ? 50 : 1)
		);
		expect(decideScore(tallies).tally).toBeNull();
	});

	it('takes the AFPB crawler on its own (5 points)', () => {
		const tallies = tallyScores([report({ source: 'api_afpb_crawler', homeScore: 3 })], null);
		expect(decideScore(tallies).tally?.key).toBe('3-0-false');
	});
});

describe('live window', () => {
	it('is today in UTC, strictly inside 00:00:00 and 23:59:59', () => {
		const { start, end } = utcDay(new Date('2026-10-25T14:20:00Z'));
		expect(start.toISOString()).toBe('2026-10-25T00:00:00.000Z');
		expect(end.toISOString()).toBe('2026-10-25T23:59:59.000Z');
	});

	it('runs from 30 minutes before kick-off to 3 hours after', () => {
		const kickOff = new Date('2026-10-25T10:00:00Z');
		const at = (iso: string) => isLive(kickOff, new Date(iso));
		expect(at('2026-10-25T09:30:00Z')).toBe(false);
		expect(at('2026-10-25T09:30:01Z')).toBe(true);
		expect(at('2026-10-25T12:59:59Z')).toBe(true);
		expect(at('2026-10-25T13:00:00Z')).toBe(false);
	});
});
