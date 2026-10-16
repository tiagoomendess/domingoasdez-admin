import { and, asc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, games, goals, players, teams } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { profilePictureUrl } from '#lib/server/media.ts';

export type Goal = typeof goals.$inferSelect;

export const GOAL_SORTS = ['id', 'game', 'minute', 'updated_at'] as const;

/** `?game=<id>` filter (from a game's page). */
export function parseGameFilter(url: URL): number | null {
	const id = Number(url.searchParams.get('game'));
	return Number.isInteger(id) && id > 0 ? id : null;
}

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');
const scoringTeams = alias(teams, 'scoring_teams');
const scoringClubs = alias(clubs, 'scoring_clubs');

/** Player name or nickname, a club of the game, or a goal/game id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const id = searchId(q);
	return or(
		like(players.name, pattern),
		like(players.nickname, pattern),
		like(homeClubs.name, pattern),
		like(awayClubs.name, pattern),
		id ? or(eq(goals.id, id), eq(goals.gameId, id)) : undefined
	);
}

const rowColumns = {
	id: goals.id,
	minute: goals.minute,
	penalty: goals.penalty,
	ownGoal: goals.ownGoal,
	visible: goals.visible,
	updatedAt: goals.updatedAt,
	gameId: games.id,
	gameDate: games.date,
	teamId: goals.teamId,
	homeTeamId: games.homeTeamId,
	homeClub: homeClubs.name,
	awayClub: awayClubs.name,
	scoringClub: scoringClubs.name,
	scoringEmblem: scoringClubs.emblem,
	playerId: players.id,
	playerName: players.name,
	playerNickname: players.nickname,
	playerPicture: players.picture
};

const selectRows = () =>
	db
		.select(rowColumns)
		.from(goals)
		.innerJoin(games, eq(games.id, goals.gameId))
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.innerJoin(scoringTeams, eq(scoringTeams.id, goals.teamId))
		.innerJoin(scoringClubs, eq(scoringClubs.id, scoringTeams.clubId))
		.leftJoin(players, eq(players.id, goals.playerId));

type Row = Awaited<ReturnType<ReturnType<typeof selectRows>['execute']>>[number];

const present = (row: Row) => ({
	...row,
	scoringEmblem: emblemUrl(row.scoringEmblem),
	playerPicture: profilePictureUrl(row.playerPicture),
	side: row.teamId === row.homeTeamId ? ('home' as const) : ('away' as const)
});

export async function listGoals(url: URL) {
	const params = parseListParams(url, GOAL_SORTS, { sort: 'id', dir: 'desc' });
	const game = parseGameFilter(url);
	const where = and(searchWhere(params.q), game ? eq(goals.gameId, game) : undefined);
	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(goals)
		.innerJoin(games, eq(games.id, goals.gameId))
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.leftJoin(players, eq(players.id, goals.playerId))
		.where(where);
	const state = listState(params, total);
	const sortColumns = {
		id: [goals.id],
		game: [games.date, goals.minute],
		minute: [goals.minute],
		updated_at: [goals.updatedAt]
	}[params.sort];

	const rows = await selectRows()
		.where(where)
		.orderBy(
			...sortColumns.map((column) => orderBy(column, state.dir)),
			orderBy(goals.id, state.dir)
		)
		.limit(state.pageSize)
		.offset(pageOffset(state));
	return { rows: rows.map(present), list: state, game };
}

export async function findGoal(id: number): Promise<Goal | undefined> {
	const [row] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
	return row;
}

export async function goalSummary(id: number) {
	const [row] = await selectRows().where(eq(goals.id, id));
	return row ? present(row) : null;
}

/** A game's goals, in minute order (goals without a minute last), for the game page. */
export async function gameGoals(gameId: number) {
	const rows = await selectRows()
		.where(eq(goals.gameId, gameId))
		.orderBy(sql`${goals.minute} IS NULL`, asc(goals.minute), asc(goals.id));
	return rows.map(present);
}

export async function playerTeamId(playerId: number): Promise<number | null | undefined> {
	const [row] = await db
		.select({ teamId: players.teamId })
		.from(players)
		.where(eq(players.id, playerId))
		.limit(1);
	return row ? row.teamId : undefined;
}
