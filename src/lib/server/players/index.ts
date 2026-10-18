import { and, asc, desc, eq, like, ne, or, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	games,
	goals,
	mvpVotes,
	playerPositions,
	players,
	teamAgents,
	teams,
	transfers
} from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	relevance,
	searchId
} from '#lib/server/list.ts';
import type { OptionsQuery } from '#lib/server/options.ts';
import { profilePictureUrl } from '#lib/server/media.ts';

export type Player = typeof players.$inferSelect;
export type PlayerPosition = (typeof playerPositions)[number];

export const PLAYER_SORTS = ['id', 'name', 'birth_date', 'club', 'created_at'] as const;

/** `?position=` filter of the list (legacy search by "Posição"). */
export function parsePositionFilter(url: URL): PlayerPosition | null {
	const value = url.searchParams.get('position');
	return (playerPositions as readonly string[]).includes(value ?? '')
		? (value as PlayerPosition)
		: null;
}

/** Legacy search fields: name, nickname, association number, or the id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const text = or(
		like(players.name, pattern),
		like(players.nickname, pattern),
		like(players.associationId, pattern)
	);
	const id = searchId(q);
	return id ? or(eq(players.id, id), text) : text;
}

export async function listPlayers(url: URL) {
	const params = parseListParams(url, PLAYER_SORTS, { sort: 'id', dir: 'desc' });
	const position = parsePositionFilter(url);
	const where = and(searchWhere(params.q), position ? eq(players.position, position) : undefined);
	const state = listState(params, await db.$count(players, where));

	const sortColumn = {
		id: players.id,
		name: players.name,
		birth_date: players.birthDate,
		club: clubs.name,
		created_at: players.createdAt
	}[params.sort];

	const rows = await db
		.select({
			id: players.id,
			name: players.name,
			nickname: players.nickname,
			picture: players.picture,
			position: players.position,
			birthDate: players.birthDate,
			visible: players.visible,
			createdAt: players.createdAt,
			teamName: teams.name,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(players)
		.leftJoin(teams, eq(teams.id, players.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(players.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({
			...row,
			picture: profilePictureUrl(row.picture),
			birthDate: row.birthDate?.slice(0, 10) ?? null,
			clubEmblem: row.clubName ? emblemUrl(row.clubEmblem) : null
		})),
		list: state,
		position
	};
}

export async function findPlayer(id: number): Promise<Player | undefined> {
	const [player] = await db.select().from(players).where(eq(players.id, id)).limit(1);
	return player;
}

/** Legacy `players_association_id_unique`, never checked by the legacy controller. */
export async function isAssociationIdTaken(value: string, exceptId?: number): Promise<boolean> {
	const [row] = await db
		.select({ id: players.id })
		.from(players)
		.where(
			exceptId
				? and(eq(players.associationId, value), ne(players.id, exceptId))
				: eq(players.associationId, value)
		)
		.limit(1);
	return Boolean(row);
}

/**
 * What a delete removes with the player (goals, MVP votes and transfers cascade). Team agents
 * linked to the player block the delete.
 */
export async function playerUsage(id: number) {
	const [goalCount, voteCount, transferCount, agentCount] = await Promise.all([
		db.$count(goals, eq(goals.playerId, id)),
		db.$count(mvpVotes, eq(mvpVotes.playerId, id)),
		db.$count(transfers, eq(transfers.playerId, id)),
		db.$count(teamAgents, eq(teamAgents.playerId, id))
	]);
	return { goals: goalCount, mvpVotes: voteCount, transfers: transferCount, agents: agentCount };
}

/** Latest transfers of the player (legacy `getLastTransfer()` order). */
export async function playerTransfers(id: number, limit = 10) {
	const rows = await db
		.select({
			id: transfers.id,
			date: transfers.date,
			visible: transfers.visible,
			teamName: teams.name,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(transfers)
		.leftJoin(teams, eq(teams.id, transfers.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(eq(transfers.playerId, id))
		.orderBy(desc(transfers.date), desc(transfers.id))
		.limit(limit);
	return rows.map((row) => ({
		...row,
		clubEmblem: row.clubName ? emblemUrl(row.clubEmblem) : null
	}));
}

export async function playerExists(id: number): Promise<boolean> {
	return (await db.$count(players, eq(players.id, id))) > 0;
}

type PlayerOptionRow = Pick<Player, 'id' | 'name' | 'nickname' | 'picture'> & {
	clubName: string | null;
};

export function playerOption(player: PlayerOptionRow): Option {
	return {
		value: player.id,
		label: player.nickname ? `${player.name} (${player.nickname})` : player.name,
		description: [`#${player.id}`, player.clubName].filter(Boolean).join(' · '),
		image: profilePictureUrl(player.picture)
	};
}

const playerOptionColumns = {
	id: players.id,
	name: players.name,
	nickname: players.nickname,
	picture: players.picture,
	clubName: clubs.name
};

export async function findPlayerOption(id: number | null | undefined): Promise<Option | null> {
	if (!id) return null;
	const [player] = await db
		.select(playerOptionColumns)
		.from(players)
		.leftJoin(teams, eq(teams.id, players.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(eq(players.id, id))
		.limit(1);
	return player ? playerOption(player) : null;
}

/** Team of one side of a game (`?game=&side=` of the player options), or null when unknown. */
export async function gameSideTeamId(gameId: number, side: string | null) {
	if (!gameId || (side !== 'home' && side !== 'away')) return null;
	const [row] = await db
		.select({ home: games.homeTeamId, away: games.awayTeamId })
		.from(games)
		.where(eq(games.id, gameId));
	return row ? row[side] : null;
}

/** Options of the player select: by name, nickname or id, best name matches first. */
export async function searchPlayerOptions(
	{ q, limit, offset }: OptionsQuery,
	teamId?: number | null
) {
	const pattern = containsPattern(q);
	const id = searchId(q);
	const search = q
		? or(
				like(players.name, pattern),
				like(players.nickname, pattern),
				id ? eq(players.id, id) : undefined
			)
		: undefined;
	const where = and(search, teamId ? eq(players.teamId, teamId) : undefined);
	return db
		.select(playerOptionColumns)
		.from(players)
		.leftJoin(teams, eq(teams.id, players.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(where)
		.orderBy(...(q ? [relevance(players.name, q)] : []), asc(players.name), asc(players.id))
		.limit(limit)
		.offset(offset);
}
