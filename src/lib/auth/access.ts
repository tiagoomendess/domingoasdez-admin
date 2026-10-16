import { ADMIN_ACCESS_PERMISSION, can } from '#lib/auth/permissions.ts';

/** What the access rules need to know about the signed-in user. */
export type AccessUser = { permissions: Iterable<string>; clubIds: readonly number[] };

/** The whole backoffice (dashboard and every section the permissions allow). */
export const hasBackoffice = (user: AccessUser) => can(user.permissions, ADMIN_ACCESS_PERMISSION);

/**
 * Today's results (`/today`, legacy `/hoje/edit`): every game with `score_update` (legacy
 * permission), or the games of the clubs the user administers (`clubs.admin_user_id`).
 */
export const canEditAnyScore = (user: AccessUser) => can(user.permissions, 'score_update');
export const canUseToday = (user: AccessUser) => canEditAnyScore(user) || user.clubIds.length > 0;

export function canEditGameScore(
	user: AccessUser,
	game: { homeClubId: number; awayClubId: number }
): boolean {
	return (
		canEditAnyScore(user) ||
		user.clubIds.includes(game.homeClubId) ||
		user.clubIds.includes(game.awayClubId)
	);
}

/** Who may sign in: backoffice admins, plus the users who only edit results. */
export const hasAdminAccess = (user: AccessUser) => hasBackoffice(user) || canUseToday(user);

/** Signed in for the results page only: everything else sends them there. */
export const TODAY_PATH = '/today';
export const isResultsOnly = (user: AccessUser) => !hasBackoffice(user);
export const resultsOnlyAllows = (pathname: string) =>
	pathname === TODAY_PATH || pathname.startsWith(`${TODAY_PATH}/`) || pathname === '/logout';
