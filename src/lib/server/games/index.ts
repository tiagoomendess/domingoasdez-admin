import { and, asc, desc, eq, gte, like, or, sql, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { alias } from 'drizzle-orm/mysql-core';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameComments,
	gameGroups,
	gameReferees,
	games,
	goals,
	mvpVotes,
	seasons,
	teams
} from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { mediaUrl } from '#lib/server/media.ts';
import type { OptionsQuery } from '#lib/server/options.ts';
import { seasonLabel } from '#lib/seasons.ts';
import { slugify } from '#lib/slug.ts';

export type Game = typeof games.$inferSelect;

export const GAME_SORTS = ['id', 'date', 'round', 'updated_at'] as const;
export const GAME_STATUSES = ['upcoming', 'played', 'postponed', 'hidden'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export function parseGameFilters(url: URL) {
	const group = Number(url.searchParams.get('group'));
	const status = url.searchParams.get('status');
	return {
		group: Number.isInteger(group) && group > 0 ? group : null,
		status: (GAME_STATUSES as readonly string[]).includes(status ?? '')
			? (status as GameStatus)
			: null
	};
}

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

/** A club name (home or away), or the game id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const id = searchId(q);
	return or(
		like(homeClubs.name, pattern),
		like(awayClubs.name, pattern),
		id ? eq(games.id, id) : undefined
	);
}

function statusWhere(status: GameStatus | null): SQL | undefined {
	switch (status) {
		case 'upcoming':
			return and(
				eq(games.finished, false),
				eq(games.postponed, false),
				gte(games.date, new Date())
			);
		case 'played':
			return eq(games.finished, true);
		case 'postponed':
			return eq(games.postponed, true);
		case 'hidden':
			return eq(games.visible, false);
		default:
			return undefined;
	}
}

const rowColumns = {
	id: games.id,
	date: games.date,
	round: games.round,
	goalsHome: games.goalsHome,
	goalsAway: games.goalsAway,
	penaltiesHome: games.penaltiesHome,
	penaltiesAway: games.penaltiesAway,
	finished: games.finished,
	postponed: games.postponed,
	visible: games.visible,
	updatedAt: games.updatedAt,
	homeClub: homeClubs.name,
	homeEmblem: homeClubs.emblem,
	homeTeam: homeTeams.name,
	awayClub: awayClubs.name,
	awayEmblem: awayClubs.emblem,
	awayTeam: awayTeams.name,
	groupId: gameGroups.id,
	groupName: gameGroups.name,
	seasonName: seasons.name,
	startYear: seasons.startYear,
	endYear: seasons.endYear,
	competitionName: competitions.name,
	image: games.image
};

/** Games with their teams, clubs, group and season (shared by the list and the page). */
const selectRows = () =>
	db
		.select(rowColumns)
		.from(games)
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.innerJoin(gameGroups, eq(gameGroups.id, games.gameGroupId))
		.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId));

type Row = {
	homeEmblem: string | null;
	awayEmblem: string | null;
	seasonName: string | null;
	startYear: number;
	endYear: number;
	competitionName: string;
	groupName: string | null;
};

const present = <R extends Row>(row: R) => ({
	...row,
	homeEmblem: emblemUrl(row.homeEmblem),
	awayEmblem: emblemUrl(row.awayEmblem),
	groupLabel: [
		row.competitionName,
		seasonLabel({ name: row.seasonName, startYear: row.startYear, endYear: row.endYear }),
		row.groupName
	]
		.filter(Boolean)
		.join(' · ')
});

export async function listGames(url: URL) {
	const params = parseListParams(url, GAME_SORTS, { sort: 'id', dir: 'desc' });
	const filters = parseGameFilters(url);
	const where = and(
		searchWhere(params.q),
		filters.group ? eq(games.gameGroupId, filters.group) : undefined,
		statusWhere(filters.status)
	);
	// The filters only read games and club names: the count needs only those joins.
	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(games)
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.where(where);
	const state = listState(params, total);

	const sortColumn = {
		id: games.id,
		date: games.date,
		round: games.round,
		updated_at: games.updatedAt
	}[params.sort];

	const rows = await selectRows()
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(games.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return { rows: rows.map(present), list: state, ...filters };
}

export async function findGame(id: number): Promise<Game | undefined> {
	const [row] = await db.select().from(games).where(eq(games.id, id)).limit(1);
	return row;
}

/** The page header: teams, clubs and where the game belongs. */
export async function gameSummary(id: number) {
	const [row] = await selectRows().where(eq(games.id, id));
	return row ? { ...present(row), image: mediaUrl(row.image) } : null;
}

/** The game's referees with their role, in the order they were added. */
export async function gameRefereeRows(gameId: number) {
	return db
		.select({
			id: gameReferees.id,
			refereeId: gameReferees.refereeId,
			typeId: gameReferees.refereeTypeId
		})
		.from(gameReferees)
		.where(eq(gameReferees.gameId, gameId))
		.orderBy(asc(gameReferees.id));
}

/** What a delete removes with the game (goals, MVP votes and flash interviews cascade). */
export async function gameUsage(id: number) {
	const [goalCount, voteCount, commentCount] = await Promise.all([
		db.$count(goals, eq(goals.gameId, id)),
		db.$count(mvpVotes, eq(mvpVotes.gameId, id)),
		db.$count(gameComments, eq(gameComments.gameId, id))
	]);
	return { goals: goalCount, votes: voteCount, comments: commentCount };
}

/**
 * The game on the public site (`domingoasdez-app` `gameHref`):
 * `/competicoes/<season>/<name>/<group>/<round>/<home>-vs-<away>`.
 */
export function publicGamePath(row: {
	seasonName: string | null;
	competitionName: string;
	startYear: number;
	endYear: number;
	groupName: string | null;
	round: number;
	homeClub: string;
	awayClub: string;
}) {
	const season =
		row.startYear === row.endYear
			? String(row.startYear)
			: `${row.startYear}-${String(row.endYear).slice(-2)}`;
	const name = slugify(row.seasonName || row.competitionName);
	return `/competicoes/${season}/${name}/${slugify(row.groupName ?? '')}/${row.round}/${slugify(row.homeClub)}-vs-${slugify(row.awayClub)}`;
}

/** "Home vs Away · date": games for selects (flash interviews, goals, …). */
export const gameOption = (row: {
	id: number;
	date: Date;
	homeClub: string;
	awayClub: string;
	homeEmblem: string | null;
	groupLabel: string;
}): Option => ({
	value: row.id,
	label: `${row.homeClub} vs ${row.awayClub}`,
	description: `#${row.id} · ${row.date.toISOString().slice(0, 10)} · ${row.groupLabel}`,
	image: row.homeEmblem
});

export async function findGameOption(id: number | null | undefined): Promise<Option | null> {
	if (!id) return null;
	const [row] = await selectRows().where(eq(games.id, id));
	return row ? gameOption(present(row)) : null;
}

/** By club name or id; the most recent games first. */
export async function searchGameOptions({ q, limit, offset }: OptionsQuery) {
	const rows = await selectRows()
		.where(searchWhere(q))
		.orderBy(desc(games.date), desc(games.id))
		.limit(limit)
		.offset(offset);
	return rows.map(present);
}
