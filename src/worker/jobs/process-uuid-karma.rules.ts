const KARMA_UUID_LENGTH = 36;

export type KarmaReport = {
	uuid: string | null;
	homeScore: number;
	awayScore: number;
	finished: boolean;
	isCorrect: boolean;
	isFake: boolean;
	/** The game's score (legacy `getHomeScore()` / `getAwayScore()`). */
	gameScore: { home: number; away: number };
};

/**
 * Legacy `ProcessUuidKarma`, three passes over the last day's reports:
 * - a finished report with the game's final score: +3
 * - an unfinished report marked correct: +1
 * - a report marked fake: −1
 *
 * Returns the change per device (one entry per report that matched a pass, summed). A device
 * whose passes cancel out keeps its 0 entry: legacy still created its `uuid_karmas` row.
 * Reports without a uuid are skipped (legacy crashed on them in the first pass), and so are
 * uuids longer than `uuid_karmas.uuid` (36; `score_reports.uuid` takes 40): legacy's insert
 * failed and aborted the rest of the night's karma.
 */
export function karmaDeltas(reports: KarmaReport[]): Map<string, number> {
	const deltas = new Map<string, number>();
	const add = (uuid: string, delta: number) => deltas.set(uuid, (deltas.get(uuid) ?? 0) + delta);

	for (const report of reports) {
		if (!report.uuid || report.uuid.length > KARMA_UUID_LENGTH) continue;
		if (
			report.finished &&
			report.homeScore === report.gameScore.home &&
			report.awayScore === report.gameScore.away
		) {
			add(report.uuid, 3);
		}
		if (!report.finished && report.isCorrect) add(report.uuid, 1);
		if (report.isFake) add(report.uuid, -1);
	}
	return deltas;
}
