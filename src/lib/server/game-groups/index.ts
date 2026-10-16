import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { competitions, gameGroups, games, groupRules, seasons } from '#lib/server/db/schema.ts';
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
import { requiredId, requiredText } from '#lib/server/validation.ts';
import { seasonLabel } from '#lib/seasons.ts';

export type GameGroup = typeof gameGroups.$inferSelect;

/** Legacy `GameGroupController` rules; season and rules existence is checked by the action. */
export const groupFormSchema = z.object({
	name: requiredText(154),
	season_id: requiredId(),
	group_rules_id: requiredId()
});

export const GROUP_SORTS = ['id', 'name', 'season', 'games', 'updated_at'] as const;

/** `?season=<id>` filter (from a season's page). */
export function parseSeasonFilter(url: URL): number | null {
	const id = Number(url.searchParams.get('season'));
	return Number.isInteger(id) && id > 0 ? id : null;
}

/** Group name, competition name, a year, or the id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const year = /^\d{4}$/.test(q) ? Number(q) : null;
	const id = searchId(q);
	return or(
		like(gameGroups.name, pattern),
		like(competitions.name, pattern),
		year ? or(eq(seasons.startYear, year), eq(seasons.endYear, year)) : undefined,
		id && !year ? eq(gameGroups.id, id) : undefined
	);
}

const gameCount = db.$count(games, eq(games.gameGroupId, gameGroups.id));

export async function listGroups(url: URL) {
	const params = parseListParams(url, GROUP_SORTS, { sort: 'id', dir: 'desc' });
	const season = parseSeasonFilter(url);
	const where = and(searchWhere(params.q), season ? eq(gameGroups.seasonId, season) : undefined);
	const from = () =>
		db
			.select({
				id: gameGroups.id,
				name: gameGroups.name,
				updatedAt: gameGroups.updatedAt,
				games: gameCount,
				seasonId: seasons.id,
				seasonName: seasons.name,
				startYear: seasons.startYear,
				endYear: seasons.endYear,
				competitionName: competitions.name,
				competitionPicture: competitions.picture,
				rulesId: groupRules.id,
				rulesName: groupRules.name
			})
			.from(gameGroups)
			.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
			.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
			.innerJoin(groupRules, eq(groupRules.id, gameGroups.groupRulesId));

	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(gameGroups)
		.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(where);
	const state = listState(params, total);

	const sortColumns = {
		id: [gameGroups.id],
		name: [gameGroups.name],
		season: [seasons.startYear, competitions.name],
		games: [gameCount],
		updated_at: [gameGroups.updatedAt]
	}[params.sort];

	const rows = await from()
		.where(where)
		.orderBy(
			...sortColumns.map((column) => orderBy(column, state.dir)),
			orderBy(gameGroups.id, state.dir)
		)
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({ ...row, competitionPicture: mediaUrl(row.competitionPicture) })),
		list: state,
		season
	};
}

export async function findGroup(id: number): Promise<GameGroup | undefined> {
	const [row] = await db.select().from(gameGroups).where(eq(gameGroups.id, id)).limit(1);
	return row;
}

/** What a delete removes with the group (its games cascade, with their goals and votes). */
export async function groupGameCount(id: number) {
	return db.$count(games, eq(games.gameGroupId, id));
}

export async function groupExists(id: number) {
	return (await db.$count(gameGroups, eq(gameGroups.id, id))) > 0;
}

type GroupOptionRow = {
	id: number;
	name: string | null;
	seasonName: string | null;
	startYear: number;
	endYear: number;
	competitionName: string;
	competitionPicture: string | null;
};

/** "Competition · 2025/2026 · Group". */
export const groupOption = (row: GroupOptionRow): Option => ({
	value: row.id,
	label: [
		row.competitionName,
		seasonLabel({ name: row.seasonName, startYear: row.startYear, endYear: row.endYear }),
		row.name || `#${row.id}`
	].join(' · '),
	image: mediaUrl(row.competitionPicture)
});

const groupOptionColumns = {
	id: gameGroups.id,
	name: gameGroups.name,
	seasonName: seasons.name,
	startYear: seasons.startYear,
	endYear: seasons.endYear,
	competitionName: competitions.name,
	competitionPicture: competitions.picture
};

export async function findGroupOption(id: number | null | undefined) {
	if (!id) return null;
	const [row] = await db
		.select(groupOptionColumns)
		.from(gameGroups)
		.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(eq(gameGroups.id, id));
	return row ? groupOption(row) : null;
}

/** Newest seasons first: games are almost always added to the current one. */
export async function searchGroupOptions({ q, limit, offset }: OptionsQuery) {
	return db
		.select(groupOptionColumns)
		.from(gameGroups)
		.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(searchWhere(q))
		.orderBy(
			desc(seasons.startYear),
			desc(competitions.priority),
			asc(competitions.name),
			asc(gameGroups.name)
		)
		.limit(limit)
		.offset(offset);
}
