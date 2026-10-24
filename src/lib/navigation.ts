import type { Component } from 'svelte';
import {
	ChartPieOutline,
	CogOutline,
	FileLinesOutline,
	CalendarMonthOutline,
	ClockOutline,
	AwardOutline,
	UsersGroupOutline,
	UsersOutline
} from 'flowbite-svelte-icons';
import { canUseToday, type AccessUser } from '#lib/auth/access.ts';
import { can, type Permission } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';

export type NavItem = {
	label: () => string;
	href: string;
	/**
	 * Needed to see the entry (the matching page checks it again on the server): a permission, or
	 * an access rule for pages that aren't guarded by a single permission.
	 */
	permission: Permission | ((user: AccessUser) => boolean);
};

export type NavGroup = {
	label: () => string;
	icon: Component;
	items: NavItem[];
};

export const dashboardItem: NavItem = {
	label: m.nav_dashboard,
	href: '/',
	permission: 'dashboard'
};

export const dashboardIcon: Component = ChartPieOutline;

/**
 * Today's results (legacy `/hoje/edit`), for `score_update` and club admins (`canUseToday`). Listed
 * under Jogos; results-only users (no groups) get it as a top-level link instead.
 */
export const todayItem: NavItem = { label: m.nav_today, href: '/today', permission: canUseToday };
export const todayIcon: Component = ClockOutline;

/**
 * Same groups and order as the legacy backoffice sidenav. Logs stay on the legacy site, together
 * with every automated process (crons, social media publishing, image generation).
 */
export const navigation: NavGroup[] = [
	{
		label: m.nav_group_content,
		icon: FileLinesOutline,
		items: [
			{ label: m.nav_articles, href: '/articles', permission: 'articles' },
			{ label: m.nav_pages, href: '/pages', permission: 'pages' },
			{ label: m.nav_media, href: '/media', permission: 'media' },
			{ label: m.nav_polls, href: '/polls', permission: 'polls' },
			// Not in the legacy backoffice: the posts the worker publishes (docs/jobs.md).
			{
				label: m.nav_social_media_posts,
				href: '/social-media-posts',
				permission: 'social_media_posts'
			}
		]
	},
	{
		label: m.nav_group_people,
		icon: UsersOutline,
		items: [
			{ label: m.nav_players, href: '/players', permission: 'players' },
			{
				label: m.nav_player_update_requests,
				href: '/player-update-requests',
				permission: 'player_update_requests'
			},
			{ label: m.nav_team_agents, href: '/team-agents', permission: 'team_agents' },
			{ label: m.nav_referees, href: '/referees', permission: 'referees' },
			{ label: m.nav_users, href: '/users', permission: 'users' },
			{
				label: m.nav_score_report_bans,
				href: '/score-report-bans',
				permission: 'score-report-bans'
			}
		]
	},
	{
		label: m.nav_group_competitions,
		icon: AwardOutline,
		items: [
			{ label: m.nav_competitions, href: '/competitions', permission: 'competitions' },
			{ label: m.nav_seasons, href: '/seasons', permission: 'seasons' },
			{ label: m.nav_game_groups, href: '/game-groups', permission: 'game_groups' },
			{ label: m.nav_group_rules, href: '/group-rules', permission: 'group_rules' }
		]
	},
	{
		label: m.nav_group_games,
		icon: CalendarMonthOutline,
		items: [
			todayItem,
			{ label: m.nav_games, href: '/games', permission: 'games' },
			{ label: m.nav_game_comments, href: '/game-comments', permission: 'games' },
			{ label: m.nav_goals, href: '/goals', permission: 'goals' }
		]
	},
	{
		label: m.nav_group_clubs,
		icon: UsersGroupOutline,
		items: [
			{ label: m.nav_clubs, href: '/clubs', permission: 'clubs' },
			{ label: m.nav_teams, href: '/teams', permission: 'teams' },
			{ label: m.nav_transfers, href: '/transfers', permission: 'transfers' }
		]
	},
	{
		label: m.nav_group_other,
		icon: CogOutline,
		items: [
			{ label: m.nav_playgrounds, href: '/playgrounds', permission: 'playgrounds' },
			{ label: m.nav_partners, href: '/partners', permission: 'partners' },
			{ label: m.nav_permissions, href: '/permissions', permission: 'permissions' },
			{ label: m.nav_info_reports, href: '/info-reports', permission: 'info_reports' },
			{ label: m.nav_audit, href: '/audit', permission: 'admin' },
			{ label: m.nav_settings, href: '/settings', permission: 'admin' }
		]
	}
];

/** Whether `user` may see the entry. */
export const canSee = (user: AccessUser, item: NavItem) =>
	typeof item.permission === 'function'
		? item.permission(user)
		: can(user.permissions, item.permission);

/** The navigation trimmed to what the user may see; empty groups are dropped. */
export function visibleNavigation(user: AccessUser): NavGroup[] {
	const access = { ...user, permissions: new Set(user.permissions) };
	return navigation
		.map((group) => ({
			...group,
			items: group.items.filter((item) => canSee(access, item))
		}))
		.filter((group) => group.items.length > 0);
}

export function isActive(pathname: string, href: string) {
	return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
