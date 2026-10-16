import { and, desc, eq, gt, inArray, isNull, like, lte, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	games,
	scoreReportBans,
	scoreReports,
	teams,
	users
} from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';

export type BanRow = typeof scoreReportBans.$inferSelect;

export const BAN_SORTS = ['id', 'expires_at'] as const;

/** `?status=`: every ban by default, like the legacy list; or only active / expired ones. */
export function parseStatusFilter(url: URL): 'active' | 'expired' | null {
	const value = url.searchParams.get('status');
	return value === 'active' || value === 'expired' ? value : null;
}

const IP = /^[\d.]+$|^[\da-f:]+:[\da-f:]*$/i;

/** The ban id, the banned user's id, an exact IP, the start of a device id, or the reason. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const id = searchId(q);
	if (id) return or(eq(scoreReportBans.id, id), eq(scoreReportBans.userId, id));
	if (IP.test(q)) return eq(scoreReportBans.ipAddress, q);
	return or(
		like(scoreReportBans.uuid, `${q.replace(/[%_\\]/g, '\\$&')}%`),
		like(scoreReportBans.reason, containsPattern(q))
	);
}

function statusWhere(status: 'active' | 'expired' | null, now: Date): SQL | undefined {
	if (status === 'active') return gt(scoreReportBans.expiresAt, now);
	if (status === 'expired') {
		return or(lte(scoreReportBans.expiresAt, now), isNull(scoreReportBans.expiresAt));
	}
	return undefined;
}

export async function listBans(url: URL) {
	const params = parseListParams(url, BAN_SORTS, { sort: 'id', dir: 'desc' });
	const status = parseStatusFilter(url);
	const now = new Date();
	const where = and(searchWhere(params.q), statusWhere(status, now));
	const state = listState(params, await db.$count(scoreReportBans, where));
	const sortColumn = params.sort === 'id' ? scoreReportBans.id : scoreReportBans.expiresAt;

	const rows = await db
		.select({
			id: scoreReportBans.id,
			userId: scoreReportBans.userId,
			userName: users.name,
			ipAddress: scoreReportBans.ipAddress,
			uuid: scoreReportBans.uuid,
			shadowBan: scoreReportBans.shadowBan,
			ipBan: scoreReportBans.ipBan,
			reason: scoreReportBans.reason,
			expiresAt: scoreReportBans.expiresAt,
			createdAt: scoreReportBans.createdAt
		})
		.from(scoreReportBans)
		.leftJoin(users, eq(users.id, scoreReportBans.userId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(scoreReportBans.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({
			...row,
			active: row.expiresAt !== null && row.expiresAt > now
		})),
		list: state,
		status
	};
}

export async function findBan(id: number): Promise<BanRow | undefined> {
	const [row] = await db.select().from(scoreReportBans).where(eq(scoreReportBans.id, id)).limit(1);
	return row;
}

export const activeBanCount = () =>
	db.$count(scoreReportBans, gt(scoreReportBans.expiresAt, new Date()));

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

/** Shown on a ban: what this device or IP reported. */
const REPORTS_LIMIT = 30;

/**
 * Score reports sent from the banned device id or IP (both indexed; `user_id` isn't, so a
 * user-only ban shows none). Newest first.
 */
export async function banReports(ban: Pick<BanRow, 'uuid' | 'ipAddress'>) {
	const matches = [
		ban.uuid ? eq(scoreReports.uuid, ban.uuid) : undefined,
		ban.ipAddress ? eq(scoreReports.ipAddress, ban.ipAddress) : undefined
	].filter((condition): condition is SQL => Boolean(condition));
	if (!matches.length) return [];

	// Ids first (each condition on its own index), then the rows with their game.
	const idSets = await Promise.all(
		matches.map((condition) =>
			db
				.select({ id: scoreReports.id })
				.from(scoreReports)
				.where(condition)
				.orderBy(desc(scoreReports.id))
				.limit(REPORTS_LIMIT)
		)
	);
	const ids = [...new Set(idSets.flat().map((row) => row.id))]
		.sort((a, b) => b - a)
		.slice(0, REPORTS_LIMIT);
	if (!ids.length) return [];

	const rows = await db
		.select({
			id: scoreReports.id,
			gameId: scoreReports.gameId,
			homeClub: homeClubs.name,
			awayClub: awayClubs.name,
			homeScore: scoreReports.homeScore,
			awayScore: scoreReports.awayScore,
			gameHomeScore: games.goalsHome,
			gameAwayScore: games.goalsAway,
			source: scoreReports.source,
			ipAddress: scoreReports.ipAddress,
			ipCountry: scoreReports.ipCountry,
			uuid: scoreReports.uuid,
			finished: scoreReports.finished,
			isFake: scoreReports.isFake,
			createdAt: scoreReports.createdAt
		})
		.from(scoreReports)
		.innerJoin(games, eq(games.id, scoreReports.gameId))
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.where(inArray(scoreReports.id, ids))
		.orderBy(desc(scoreReports.id));

	return rows.map((row) => ({
		...row,
		finished: Boolean(row.finished),
		isFake: Boolean(row.isFake),
		sameDevice: Boolean(ban.uuid && row.uuid === ban.uuid)
	}));
}
