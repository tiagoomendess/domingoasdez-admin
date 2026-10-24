import type { LatLng } from '#lib/server/db/columns.ts';

export type ConsumerReport = {
	id: number;
	homeScore: number;
	awayScore: number;
	finished: boolean;
	source: string;
	userId: number | null;
	location: LatLng | null;
	/** Reported location accuracy, in metres. */
	accuracy: number | null;
};

/** The reports that agree on one score, with their points. */
export type ScoreTally = {
	/** `home-away-finished`, the legacy grouping key (e.g. `2-1-false`). */
	key: string;
	home: number;
	away: number;
	finished: boolean;
	points: number;
	reports: number;
};

export type Decision = { tally: ScoreTally | null; summary: string };

/** Legacy sources that get extra trust. */
const AFPB_CRAWLER = 'api_afpb_crawler';
/** Reports from further than this (or closer than 1 m) don't get the location point. */
const MAX_DISTANCE_M = 150;
const MIN_DISTANCE_M = 1;
const MAX_ACCURACY_M = 400;
const EARTH_RADIUS_M = 6_371_000;

export const scoreKey = (home: number, away: number, finished: boolean) =>
	`${home}-${away}-${finished}`;

/** Reports of the last 7 minutes count. */
export const REPORT_WINDOW_MS = 7 * 60 * 1000;
const WARMUP_MS = 30 * 60 * 1000;
const GAME_SPAN_MS = 3 * 60 * 60 * 1000;

/** Legacy `getLiveGames()` day: today in UTC, strictly between 00:00:00 and 23:59:59. */
export function utcDay(now: Date): { start: Date; end: Date } {
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1000) };
}

/** Live: from 30 minutes before kick-off to 3 hours after (both exclusive). */
export const isLive = (kickOff: Date, now: Date) =>
	now.getTime() > kickOff.getTime() - WARMUP_MS && now.getTime() < kickOff.getTime() + GAME_SPAN_MS;

/** Legacy `haversineGreatCircleDistance`, in metres. */
export function distanceMetres(from: LatLng, to: LatLng): number {
	const rad = (degrees: number) => (degrees * Math.PI) / 180;
	const latFrom = rad(from.lat);
	const latTo = rad(to.lat);
	const latDelta = latTo - latFrom;
	const lngDelta = rad(to.lng) - rad(from.lng);
	const angle =
		2 *
		Math.asin(
			Math.sqrt(
				Math.sin(latDelta / 2) ** 2 +
					Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lngDelta / 2) ** 2
			)
		);
	return angle * EARTH_RADIUS_M;
}

/**
 * Legacy points of one report: 1, +1 with a location, +1 more when it's accurate (≤ 400 m) and
 * 1–150 m from the playground, +1 from a signed-in user, +4 from the AFPB crawler.
 *
 * Legacy read the accuracy as an integer and treated 0 as missing (PHP `0 != null` is false),
 * so sub-metre accuracies get no distance check; kept. A game without a playground location
 * gets no distance point (legacy crashed on it and skipped the game).
 */
export function reportPoints(report: ConsumerReport, playground: LatLng | null): number {
	let points = 1;
	if (report.location) {
		points++;
		const accuracy = report.accuracy === null ? 0 : Math.trunc(report.accuracy);
		if (accuracy !== 0 && accuracy <= MAX_ACCURACY_M && playground) {
			const distance = Math.round(distanceMetres(report.location, playground) * 100) / 100;
			if (distance >= MIN_DISTANCE_M && distance <= MAX_DISTANCE_M) points++;
		}
	}
	if (report.userId) points++;
	if (report.source === AFPB_CRAWLER) points += 4;
	return points;
}

/**
 * Groups the reports by score (in the order each score was first reported) and adds the
 * agreement bonus: +1 when two different sources sent the score, +2 for three or more.
 */
export function tallyScores(reports: ConsumerReport[], playground: LatLng | null): ScoreTally[] {
	const tallies = new Map<string, ScoreTally & { sources: Set<string> }>();
	for (const report of reports) {
		const key = scoreKey(report.homeScore, report.awayScore, report.finished);
		const tally = tallies.get(key) ?? {
			key,
			home: report.homeScore,
			away: report.awayScore,
			finished: report.finished,
			points: 0,
			reports: 0,
			sources: new Set<string>()
		};
		tally.points += reportPoints(report, playground);
		tally.reports++;
		tally.sources.add(report.source);
		tallies.set(key, tally);
	}
	return [...tallies.values()].map(({ sources, ...tally }) => ({
		...tally,
		points: tally.points + (sources.size >= 3 ? 2 : sources.size === 2 ? 1 : 0)
	}));
}

const describe = (tallies: ScoreTally[]) =>
	tallies.map((tally) => `${tally.key}(${tally.points})`).join(', ');

/**
 * Legacy decision between the competing scores of the last minutes:
 * - one score: applied with more than 4 points;
 * - four or more: too risky, nothing;
 * - two or three: the best one, when it has at least 4 points and half of them is at least the
 *   second's and more than the lowest's (the second's when there are only two).
 */
export function decideScore(tallies: ScoreTally[]): Decision {
	if (tallies.length === 0) return { tally: null, summary: 'no reports' };
	if (tallies.length === 1) {
		const [only] = tallies;
		return { tally: only.points > 4 ? only : null, summary: describe(tallies) };
	}
	if (tallies.length >= 4) return { tally: null, summary: `too many scores: ${describe(tallies)}` };

	// Stable sort: equal points keep the order they were reported in (PHP 8 `arsort`).
	const ranked = [...tallies].sort((a, b) => b.points - a.points);
	const [best, second] = ranked;
	const lowest = ranked[ranked.length - 1];
	const summary = `1st ${best.key}(${best.points}) | 2nd ${second.key}(${second.points}) | lowest ${lowest.key}(${lowest.points})`;
	const apply =
		best.points >= 4 && best.points / 2 >= second.points && best.points / 2 > lowest.points;
	return { tally: apply ? best : null, summary };
}
