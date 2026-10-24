import type { BanTarget } from '#lib/server/score-report-bans/form.ts';

/** Website reports changed in the last 24 hours are checked. */
export const WINDOW_MS = 24 * 60 * 60 * 1000;
/** `uuid_karmas.uuid` length (`score_reports.uuid` takes 40). */
const KARMA_UUID_LENGTH = 36;

export type CheckedReport = {
	homeScore: number;
	awayScore: number;
	isFake: boolean;
	/** The game's final score (legacy `getHomeScore()` / `getAwayScore()`). */
	gameScore: { home: number; away: number };
};

/**
 * Legacy rule: a report is fake when it was flagged by hand or one of its scores is above the
 * final score (a lower score may just be an early one).
 */
export const isFakeReport = (report: CheckedReport) =>
	report.isFake ||
	report.homeScore > report.gameScore.home ||
	report.awayScore > report.gameScore.away;

/** The ban's target, cut to the legacy column limits (`Str::limit(…, n, '')`). */
export function banTarget(report: {
	uuid: string | null;
	userId: number | null;
	ipAddress: string | null;
	userAgent: string | null;
}): BanTarget {
	return {
		uuid: report.uuid?.slice(0, 36) || null,
		userId: report.userId,
		ipAddress: report.ipAddress?.slice(0, 40) || null,
		userAgent: report.userAgent?.slice(0, 255) || null
	};
}

/** Legacy de-duplication key within one run: user, IP and device of the report. */
export const banKey = (report: {
	userId: number | null;
	ipAddress: string | null;
	uuid: string | null;
}) => [report.userId ?? '', report.ipAddress ?? '', report.uuid ?? ''].join('_');

export const banReason = (matchName: string) =>
	`Envio de um resultado falso no jogo ${matchName}`.slice(0, 255);

/**
 * Legacy `handleKarma`: the first fake report flips the device to −1, each later one takes 3
 * more. A new device starts at −1.
 */
export const nextKarma = (current: number | null) =>
	current === null || current >= 0 ? -1 : current - 3;

/** The device whose karma changes, or null (no uuid, or too long for `uuid_karmas`). */
export const karmaUuid = (uuid: string | null) =>
	uuid && uuid.length <= KARMA_UUID_LENGTH ? uuid : null;
