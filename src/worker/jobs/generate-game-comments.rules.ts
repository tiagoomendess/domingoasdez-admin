import { commentPath } from '#lib/server/game-comments/index.ts';

/** Finished games of the last 2 days get their flash interviews. */
export const WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
/** Games handled per run (legacy `limit(10)`). */
export const GAMES_PER_RUN = 10;

/**
 * Legacy `getNotificationEmail`: the team's contact email, else the club's, else the club
 * admin's. Legacy never reached the third one (`$club->admin_user` is not the `adminUser`
 * relation, so it was always empty); fixed, decided 2026-10-23.
 */
export function notificationEmail(candidates: {
	team: string | null;
	club: string | null;
	clubAdmin: string | null;
}): string | null {
	for (const email of [candidates.team, candidates.club, candidates.clubAdmin]) {
		const trimmed = email?.trim();
		if (trimmed) return trimmed;
	}
	return null;
}

/** A 4-digit PIN (leading zeros kept), from `randomDigit` (`crypto.randomInt(10)`). */
export const generatePin = (randomDigit: () => number) =>
	Array.from({ length: 4 }, () => String(randomDigit())).join('');

/**
 * The public flash interview page (same link as the admin's flash interviews list) and its
 * unsubscribe page.
 */
export function flashInterviewUrls(siteUrl: string, uuid: string, pin: string) {
	const base = siteUrl.replace(/\/+$/, '');
	return {
		action: `${base}${commentPath({ uuid, pin })}`,
		unsubscribe: `${base}/flash-interview/${uuid}/manage-notifications?pin=${pin}`
	};
}
