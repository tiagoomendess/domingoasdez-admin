import { and, asc, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
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
import { seasonLabel } from '#lib/seasons.ts';

export type Season = typeof seasons.$inferSelect;

export const SEASON_SORTS = ['id', 'competition', 'years', 'groups', 'updated_at'] as const;

/** `?competition=<id>` filter of the list. */
export function parseCompetitionFilter(url: URL): number | null {
	const id = Number(url.searchParams.get('competition'));
	return Number.isInteger(id) && id > 0 ? id : null;
}

/** Display name, competition name, a year ("2025"), or the id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const year = /^\d{4}$/.test(q) ? Number(q) : null;
	const id = searchId(q);
	return or(
		like(seasons.name, pattern),
		like(competitions.name, pattern),
		year ? or(eq(seasons.startYear, year), eq(seasons.endYear, year)) : undefined,
		id && !year ? eq(seasons.id, id) : undefined
	);
}

const groupCount = db.$count(gameGroups, eq(gameGroups.seasonId, seasons.id));

export async function listSeasons(url: URL) {
	const params = parseListParams(url, SEASON_SORTS, { sort: 'id', dir: 'desc' });
	const competition = parseCompetitionFilter(url);
	const where = and(
		searchWhere(params.q),
		competition ? eq(seasons.competitionId, competition) : undefined
	);
	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(seasons)
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(where);
	const state = listState(params, total);

	const sortColumns = {
		id: [seasons.id],
		competition: [competitions.name, seasons.startYear],
		years: [seasons.startYear, seasons.endYear],
		groups: [groupCount],
		updated_at: [seasons.updatedAt]
	}[params.sort];

	const rows = await db
		.select({
			id: seasons.id,
			name: seasons.name,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			visible: seasons.visible,
			updatedAt: seasons.updatedAt,
			groups: groupCount,
			competitionId: competitions.id,
			competitionName: competitions.name,
			competitionPicture: competitions.picture
		})
		.from(seasons)
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(where)
		.orderBy(
			...sortColumns.map((column) => orderBy(column, state.dir)),
			orderBy(seasons.id, state.dir)
		)
		.limit(state.pageSize)
		.offset(pageOffset(state));

	const competitionOptions = await db
		.select({ value: competitions.id, label: competitions.name })
		.from(competitions)
		.orderBy(desc(competitions.priority), asc(competitions.name));

	return {
		rows: rows.map((row) => ({ ...row, competitionPicture: mediaUrl(row.competitionPicture) })),
		list: state,
		competition,
		competitionOptions: competitionOptions.map((row) => ({
			value: String(row.value),
			label: row.label
		}))
	};
}

export async function findSeason(id: number): Promise<Season | undefined> {
	const [row] = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
	return row;
}

export async function seasonExists(id: number) {
	return (await db.$count(seasons, eq(seasons.id, id))) > 0;
}

/** The season's groups with their rules and game count. */
export async function seasonGroups(id: number) {
	return db
		.select({
			id: gameGroups.id,
			name: gameGroups.name,
			rulesId: groupRules.id,
			rulesName: groupRules.name,
			games: db.$count(games, eq(games.gameGroupId, gameGroups.id))
		})
		.from(gameGroups)
		.innerJoin(groupRules, eq(groupRules.id, gameGroups.groupRulesId))
		.where(eq(gameGroups.seasonId, id))
		.orderBy(asc(gameGroups.name), asc(gameGroups.id));
}

/** What a delete removes with the season (groups → games cascade). */
export async function seasonUsage(id: number) {
	const groupIds = db
		.select({ id: gameGroups.id })
		.from(gameGroups)
		.where(eq(gameGroups.seasonId, id));
	const [groupTotal, gameTotal] = await Promise.all([
		db.$count(gameGroups, eq(gameGroups.seasonId, id)),
		db.$count(games, inArray(games.gameGroupId, groupIds))
	]);
	return { groups: groupTotal, games: gameTotal };
}

type SeasonOptionRow = {
	id: number;
	name: string | null;
	startYear: number;
	endYear: number;
	competitionName: string;
	competitionPicture: string | null;
};

/** "Competition · 2025/2026" (+ the season's display name). */
export const seasonOption = (row: SeasonOptionRow): Option => ({
	value: row.id,
	label: `${row.competitionName} · ${seasonLabel(row)}`,
	image: mediaUrl(row.competitionPicture)
});

const optionColumns = {
	id: seasons.id,
	name: seasons.name,
	startYear: seasons.startYear,
	endYear: seasons.endYear,
	competitionName: competitions.name,
	competitionPicture: competitions.picture
};

export async function findSeasonOption(id: number | null | undefined) {
	if (!id) return null;
	const [row] = await db
		.select(optionColumns)
		.from(seasons)
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(eq(seasons.id, id));
	return row ? seasonOption(row) : null;
}

/** Newest seasons first: new groups and games are almost always for the current one. */
export async function searchSeasonOptions({ q, limit, offset }: OptionsQuery) {
	return db
		.select(optionColumns)
		.from(seasons)
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.where(searchWhere(q))
		.orderBy(
			desc(seasons.startYear),
			desc(competitions.priority),
			asc(competitions.name),
			desc(seasons.id)
		)
		.limit(limit)
		.offset(offset);
}
