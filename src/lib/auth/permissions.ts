/**
 * Permission names used by the legacy backoffice (`permissions` table + `has_permission()`).
 * Convention: `<resource>` to list/view, `<resource>.create` to create/delete, `<resource>.edit`
 * to edit. `admin` grants everything. `dashboard` is required to enter the admin at all.
 *
 * Some names exist only in legacy code (e.g. `team_agents`, `group_rules`), so in practice only
 * `admin` users pass those checks until the rows are created.
 */
export const PERMISSIONS = [
	'admin',
	'dashboard',
	'disable_ads',
	'score_update',
	'articles',
	'articles.create',
	'articles.edit',
	'clubs',
	'clubs.create',
	'clubs.edit',
	'competitions',
	'competitions.create',
	'competitions.edit',
	'game_groups',
	'game_groups.create',
	'game_groups.edit',
	'games',
	'games.create',
	'games.edit',
	'goals',
	'goals.create',
	'goals.edit',
	'group_rules',
	'group_rules.create',
	'group_rules.edit',
	'info_reports',
	'info_reports.create',
	'info_reports.edit',
	'media',
	'media.create',
	'media.edit',
	'pages',
	'pages.create',
	'pages.edit',
	'partners',
	'partners.create',
	'partners.edit',
	'permissions',
	'permissions.create',
	'permissions.edit',
	// New in this admin (no legacy section): the stadium screens of domingoasdez-app.
	'placards',
	'placards.edit',
	'player_update_requests',
	'player_update_requests.create',
	'player_update_requests.edit',
	'players',
	'players.create',
	'players.edit',
	'playgrounds',
	'playgrounds.create',
	'playgrounds.edit',
	'polls',
	'polls.create',
	'polls.edit',
	'referees',
	'referees.create',
	'referees.edit',
	'score-report-bans',
	'score-report-bans.create',
	'score-report-bans.edit',
	'score_report_bans.create',
	'seasons',
	'seasons.create',
	'seasons.edit',
	// New in this admin (no legacy section): the row is created in Permissions to grant it.
	'social_media_posts',
	'social_media_posts.create',
	'social_media_posts.edit',
	'team_agents',
	'team_agents.create',
	'team_agents.edit',
	'teams',
	'teams.create',
	'teams.edit',
	'transfers',
	'transfers.create',
	'transfers.edit',
	'users',
	'users.create',
	'users.edit'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Permission required to sign in to the admin (legacy DashboardController gate). */
export const ADMIN_ACCESS_PERMISSION: Permission = 'dashboard';

/** Ports `has_permission($name)`: `admin` grants everything, otherwise an exact match. */
export function can(granted: Iterable<string>, permission: Permission): boolean {
	const names = granted instanceof Set ? (granted as Set<string>) : new Set(granted);
	return names.has('admin') || names.has(permission);
}
