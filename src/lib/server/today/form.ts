import { z } from 'zod';
import { fromLocalInput } from '#lib/datetime.ts';
import { checkbox } from '#lib/server/forms.ts';
import { integer, requiredId, required } from '#lib/server/validation.ts';

/** Legacy `GamesController@todayUpdateScore`: the game, both scores and "finished". */
export const scoreFormSchema = z.object({
	game_id: requiredId(),
	goals_home: required(integer(0, 99)),
	goals_away: required(integer(0, 99)),
	finished: checkbox
});

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` of `date` in `timeZone`. */
export function localDay(date: Date, timeZone: string): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date);
}

/** The day before / after a `YYYY-MM-DD` (calendar arithmetic, no timezone). */
export function shiftDay(day: string, days: number): string {
	const date = new Date(`${day}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/**
 * The UTC range of a calendar day in the admin's timezone. Legacy used the server's (UTC) day,
 * so games after 23:00 in summer showed on the next day's page.
 */
export function dayRange(day: string, timeZone: string): { start: Date; end: Date } | null {
	if (!DAY.test(day)) return null;
	const start = fromLocalInput(`${day}T00:00`, timeZone);
	const end = fromLocalInput(`${shiftDay(day, 1)}T00:00`, timeZone);
	return start && end ? { start, end } : null;
}

/**
 * Legacy tally of the latest reports of a game (newest first): counts per "home-away" score,
 * stopping once 5 different scores are counted.
 */
export function reportedScores(
	reports: { homeScore: number; awayScore: number }[]
): { score: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const report of reports) {
		const score = `${report.homeScore}-${report.awayScore}`;
		if (!counts.has(score) && counts.size >= 5) break;
		counts.set(score, (counts.get(score) ?? 0) + 1);
	}
	return [...counts].map(([score, count]) => ({ score, count }));
}

export type AccuracyLevel = 'best' | 'good' | 'fair' | 'poor' | 'bad';

/** Legacy colours of the location pin, by the reported accuracy in metres. */
export function accuracyLevel(metres: number | null): AccuracyLevel | null {
	if (metres === null) return null;
	if (metres < 50) return 'best';
	if (metres < 100) return 'good';
	if (metres < 250) return 'fair';
	if (metres < 600) return 'poor';
	return 'bad';
}

/** Games grouped by competition, in the order the games come (competition priority first). */
export function groupByCompetition<
	Game extends { competitionId: number; competitionName: string; competitionPicture: string | null }
>(rows: Game[]) {
	const sections = new Map<
		number,
		{ id: number; name: string; picture: string | null; games: Game[] }
	>();
	for (const row of rows) {
		let section = sections.get(row.competitionId);
		if (!section) {
			section = {
				id: row.competitionId,
				name: row.competitionName,
				picture: row.competitionPicture,
				games: []
			};
			sections.set(row.competitionId, section);
		}
		section.games.push(row);
	}
	return [...sections.values()];
}

/** Legacy `GamesController@updateIsFake`: a report is unknown, correct or fake (never both). */
export const REPORT_STATUSES = ['unknown', 'correct', 'fake'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const reportStatusSchema = z.object({ status: z.enum(REPORT_STATUSES) });

export const statusFlags = (status: ReportStatus) => ({
	isFake: status === 'fake',
	isCorrect: status === 'correct'
});
