import { and, eq, gt, like, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, gameComments, games, teams } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { commentStatus, type CommentStatus } from './form';

export type GameComment = typeof gameComments.$inferSelect;

export const COMMENT_SORTS = ['id', 'deadline', 'updated_at'] as const;
export const COMMENT_STATUSES = ['waiting', 'answered', 'expired', 'used'] as const;

export function parseStatusFilter(url: URL): CommentStatus | null {
	const value = url.searchParams.get('status');
	return (COMMENT_STATUSES as readonly string[]).includes(value ?? '')
		? (value as CommentStatus)
		: null;
}

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');
const answerTeams = alias(teams, 'answer_teams');
const answerClubs = alias(clubs, 'answer_clubs');

const hasContent = ne(sql`TRIM(${gameComments.content})`, '');

function statusWhere(status: CommentStatus | null): SQL | undefined {
	const now = new Date();
	switch (status) {
		case 'used':
			return eq(gameComments.used, true);
		case 'answered':
			return and(eq(gameComments.used, false), hasContent);
		case 'waiting':
			return and(
				eq(gameComments.used, false),
				sql`NOT ${hasContent}`,
				gt(gameComments.deadline, now)
			);
		case 'expired':
			return and(
				eq(gameComments.used, false),
				sql`NOT ${hasContent}`,
				lte(gameComments.deadline, now)
			);
		default:
			return undefined;
	}
}

/** A club of the game (or the answering team), the comment text, or a game/comment id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const id = searchId(q);
	return or(
		like(homeClubs.name, pattern),
		like(awayClubs.name, pattern),
		like(gameComments.content, pattern),
		id ? or(eq(gameComments.id, id), eq(gameComments.gameId, id)) : undefined
	);
}

const rowColumns = {
	id: gameComments.id,
	uuid: gameComments.uuid,
	pin: gameComments.pin,
	content: gameComments.content,
	used: gameComments.used,
	deadline: gameComments.deadline,
	createdAt: gameComments.createdAt,
	updatedAt: gameComments.updatedAt,
	gameId: games.id,
	gameDate: games.date,
	teamId: gameComments.teamId,
	homeTeamId: games.homeTeamId,
	homeClub: homeClubs.name,
	homeEmblem: homeClubs.emblem,
	awayClub: awayClubs.name,
	awayEmblem: awayClubs.emblem,
	teamClub: answerClubs.name,
	teamName: answerTeams.name
};

const selectRows = () =>
	db
		.select(rowColumns)
		.from(gameComments)
		.innerJoin(games, eq(games.id, gameComments.gameId))
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.innerJoin(answerTeams, eq(answerTeams.id, gameComments.teamId))
		.innerJoin(answerClubs, eq(answerClubs.id, answerTeams.clubId));

type Row = Awaited<ReturnType<ReturnType<typeof selectRows>['execute']>>[number];

const present = (row: Row, now = new Date()) => ({
	...row,
	homeEmblem: emblemUrl(row.homeEmblem),
	awayEmblem: emblemUrl(row.awayEmblem),
	side: row.teamId === row.homeTeamId ? ('home' as const) : ('away' as const),
	status: commentStatus(row, now)
});

export async function listComments(url: URL) {
	// Legacy list: newest first.
	const params = parseListParams(url, COMMENT_SORTS, { sort: 'id', dir: 'desc' });
	const status = parseStatusFilter(url);
	const where = and(searchWhere(params.q), statusWhere(status));
	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(gameComments)
		.innerJoin(games, eq(games.id, gameComments.gameId))
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.where(where);
	const state = listState(params, total);
	const sortColumn = {
		id: gameComments.id,
		deadline: gameComments.deadline,
		updated_at: gameComments.updatedAt
	}[params.sort];

	const rows = await selectRows()
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(gameComments.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));
	const now = new Date();
	return { rows: rows.map((row) => present(row, now)), list: state, status };
}

export async function findComment(id: number): Promise<GameComment | undefined> {
	const [row] = await db.select().from(gameComments).where(eq(gameComments.id, id)).limit(1);
	return row;
}

export async function commentSummary(id: number) {
	const [row] = await selectRows().where(eq(gameComments.id, id));
	return row ? present(row) : null;
}

/** One flash interview per team and game (the legacy job creates one for each side). */
export async function commentExists(gameId: number, teamId: number) {
	return (
		(await db.$count(
			gameComments,
			and(eq(gameComments.gameId, gameId), eq(gameComments.teamId, teamId))
		)) > 0
	);
}

/** The public page where the club writes it (`domingoasdez-app` `/flash-interview/<uuid>`). */
export const commentPath = (row: { uuid: string; pin: string }) =>
	`/flash-interview/${row.uuid}?pin=${row.pin}`;
