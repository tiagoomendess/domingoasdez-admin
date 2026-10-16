import { and, asc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, players, teams, transfers } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { profilePictureUrl } from '#lib/server/media.ts';
import type { TimelineEntry } from './timeline';

export type Transfer = typeof transfers.$inferSelect;

export const TRANSFER_SORTS = ['id', 'date', 'player', 'updated_at'] as const;

/** `?player=<id>` filter (from a player's page). */
export function parsePlayerFilter(url: URL): number | null {
	const id = Number(url.searchParams.get('player'));
	return Number.isInteger(id) && id > 0 ? id : null;
}

/** A team as the pages show it: "Club · Team" with the emblem, or null for "no team". */
export type TeamLabel = { id: number; label: string; emblem: string } | null;

/** "Club · Team" of each team id. */
export async function teamLabels(ids: (number | null)[]): Promise<Map<number, TeamLabel>> {
	const wanted = [...new Set(ids.filter((id): id is number => id !== null))];
	if (!wanted.length) return new Map();
	const rows = await db
		.select({ id: teams.id, name: teams.name, club: clubs.name, emblem: clubs.emblem })
		.from(teams)
		.innerJoin(clubs, eq(clubs.id, teams.clubId))
		.where(inArray(teams.id, wanted));
	return new Map(
		rows.map((row) => [
			row.id,
			{ id: row.id, label: `${row.club} · ${row.name}`, emblem: emblemUrl(row.emblem) }
		])
	);
}

const toTeams = alias(teams, 'to_teams');
const toClubs = alias(clubs, 'to_clubs');
const earlier = alias(transfers, 'earlier');
/** In raw SQL Drizzle renders an alias as its name only: spell out `transfers AS earlier`. */
const earlierFrom = sql`${transfers} AS ${sql.identifier('earlier')}`;

/** The player's transfers before this one (date order; on the same date, by id). */
const isEarlier = sql`${earlier.playerId} = ${transfers.playerId}
	AND (${earlier.date} < ${transfers.date} OR (${earlier.date} = ${transfers.date} AND ${earlier.id} < ${transfers.id}))`;

/** The team of the transfer just before this one ("from"). */
const previousTeamId = sql<number | null>`(
	SELECT ${earlier.teamId} FROM ${earlierFrom} WHERE ${isEarlier}
	ORDER BY ${earlier.date} DESC, ${earlier.id} DESC LIMIT 1
)`;

/** Whether there is a transfer before this one (a null previous team can mean "no team"). */
const hasEarlier = sql<number>`EXISTS (SELECT 1 FROM ${earlierFrom} WHERE ${isEarlier})`.mapWith(
	Number
);

/** Player name or nickname, the destination club, or a transfer/player id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const id = searchId(q);
	return or(
		like(players.name, pattern),
		like(players.nickname, pattern),
		like(toClubs.name, pattern),
		id ? or(eq(transfers.id, id), eq(transfers.playerId, id)) : undefined
	);
}

export async function listTransfers(url: URL) {
	// Newest moves first, which is what the legacy list (by id) mostly showed.
	const params = parseListParams(url, TRANSFER_SORTS, { sort: 'date', dir: 'desc' });
	const player = parsePlayerFilter(url);
	const where = and(searchWhere(params.q), player ? eq(transfers.playerId, player) : undefined);
	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(transfers)
		.innerJoin(players, eq(players.id, transfers.playerId))
		.leftJoin(toTeams, eq(toTeams.id, transfers.teamId))
		.leftJoin(toClubs, eq(toClubs.id, toTeams.clubId))
		.where(where);
	const state = listState(params, total);
	const sortColumn = {
		id: transfers.id,
		date: transfers.date,
		player: players.name,
		updated_at: transfers.updatedAt
	}[params.sort];

	const rows = await db
		.select({
			id: transfers.id,
			date: transfers.date,
			visible: transfers.visible,
			teamId: transfers.teamId,
			previousTeamId,
			hasEarlier,
			playerId: players.id,
			playerName: players.name,
			playerPicture: players.picture
		})
		.from(transfers)
		.innerJoin(players, eq(players.id, transfers.playerId))
		.leftJoin(toTeams, eq(toTeams.id, transfers.teamId))
		.leftJoin(toClubs, eq(toClubs.id, toTeams.clubId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(transfers.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	const labels = await teamLabels(rows.flatMap((row) => [row.teamId, row.previousTeamId]));
	return {
		rows: rows.map((row) => ({
			...row,
			playerPicture: profilePictureUrl(row.playerPicture),
			to: row.teamId ? (labels.get(row.teamId) ?? null) : null,
			from: row.previousTeamId ? (labels.get(row.previousTeamId) ?? null) : null,
			/** The player's first transfer has no "from". */
			first: !row.hasEarlier
		})),
		list: state,
		player
	};
}

export async function findTransfer(id: number): Promise<Transfer | undefined> {
	const [row] = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1);
	return row;
}

/** The player's transfers, oldest first (the rules read them in date order). */
export async function playerTransfers(playerId: number): Promise<Transfer[]> {
	return db
		.select()
		.from(transfers)
		.where(eq(transfers.playerId, playerId))
		.orderBy(asc(transfers.date), asc(transfers.id));
}

export const toEntry = (row: Transfer): TimelineEntry => ({
	id: row.id,
	teamId: row.teamId,
	date: row.date
});

/** The player's history for a page: oldest first, with team labels. */
export async function playerTimeline(playerId: number) {
	const rows = await playerTransfers(playerId);
	const labels = await teamLabels(rows.map((row) => row.teamId));
	return rows.map((row) => ({
		id: row.id,
		date: row.date,
		visible: row.visible,
		team: row.teamId ? (labels.get(row.teamId) ?? null) : null
	}));
}

export async function playerSummary(playerId: number) {
	const [row] = await db
		.select({
			id: players.id,
			name: players.name,
			picture: players.picture,
			teamId: players.teamId
		})
		.from(players)
		.where(eq(players.id, playerId))
		.limit(1);
	if (!row) return null;
	const labels = await teamLabels([row.teamId]);
	return {
		...row,
		picture: profilePictureUrl(row.picture),
		team: row.teamId ? (labels.get(row.teamId) ?? null) : null
	};
}
