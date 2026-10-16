import { and, asc, desc, eq, inArray, like, ne, or, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { db } from '#lib/server/db/index.ts';
import { competitions, gameGroups, games, seasons } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	relevance,
	searchId
} from '#lib/server/list.ts';
import { mediaUrl } from '#lib/server/media.ts';
import type { OptionsQuery } from '#lib/server/options.ts';

export type Competition = typeof competitions.$inferSelect;

export const COMPETITION_SORTS = ['id', 'name', 'priority', 'seasons', 'updated_at'] as const;

function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const byName = like(competitions.name, containsPattern(q));
	const id = searchId(q);
	return id ? or(eq(competitions.id, id), byName) : byName;
}

const seasonCount = db.$count(seasons, eq(seasons.competitionId, competitions.id));

export async function listCompetitions(url: URL) {
	// Legacy list: highest priority first.
	const params = parseListParams(url, COMPETITION_SORTS, { sort: 'priority', dir: 'desc' });
	const where = searchWhere(params.q);
	const state = listState(params, await db.$count(competitions, where));

	const sortColumn = {
		id: competitions.id,
		name: competitions.name,
		priority: competitions.priority,
		seasons: seasonCount,
		updated_at: competitions.updatedAt
	}[params.sort];

	const rows = await db
		.select({
			id: competitions.id,
			name: competitions.name,
			picture: competitions.picture,
			priority: competitions.priority,
			visible: competitions.visible,
			socialMediaEnabled: competitions.socialMediaEnabled,
			seasons: seasonCount,
			updatedAt: competitions.updatedAt
		})
		.from(competitions)
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(competitions.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return { rows: rows.map((row) => ({ ...row, picture: mediaUrl(row.picture) })), list: state };
}

export async function findCompetition(id: number): Promise<Competition | undefined> {
	const [row] = await db.select().from(competitions).where(eq(competitions.id, id)).limit(1);
	return row;
}

/** Legacy `unique:competitions,name`. */
export async function isCompetitionNameTaken(name: string, exceptId?: number) {
	const [row] = await db
		.select({ id: competitions.id })
		.from(competitions)
		.where(
			exceptId
				? and(eq(competitions.name, name), ne(competitions.id, exceptId))
				: eq(competitions.name, name)
		)
		.limit(1);
	return Boolean(row);
}

export async function competitionExists(id: number) {
	return (await db.$count(competitions, eq(competitions.id, id))) > 0;
}

/** The competition's seasons, newest first, with their group count. */
export async function competitionSeasons(id: number) {
	return db
		.select({
			id: seasons.id,
			name: seasons.name,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			visible: seasons.visible,
			groups: db.$count(gameGroups, eq(gameGroups.seasonId, seasons.id))
		})
		.from(seasons)
		.where(eq(seasons.competitionId, id))
		.orderBy(desc(seasons.startYear), desc(seasons.endYear), desc(seasons.id));
}

/** What a delete removes with the competition (seasons → groups → games cascade). */
export async function competitionUsage(id: number) {
	const seasonIds = db
		.select({ id: seasons.id })
		.from(seasons)
		.where(eq(seasons.competitionId, id));
	const groupIds = db
		.select({ id: gameGroups.id })
		.from(gameGroups)
		.where(inArray(gameGroups.seasonId, seasonIds));
	const [seasonTotal, groupTotal, gameTotal] = await Promise.all([
		db.$count(seasons, eq(seasons.competitionId, id)),
		db.$count(gameGroups, inArray(gameGroups.seasonId, seasonIds)),
		db.$count(games, inArray(games.gameGroupId, groupIds))
	]);
	return { seasons: seasonTotal, groups: groupTotal, games: gameTotal };
}

export const competitionOption = (row: Pick<Competition, 'id' | 'name' | 'picture'>): Option => ({
	value: row.id,
	label: row.name,
	image: mediaUrl(row.picture)
});

const optionColumns = {
	id: competitions.id,
	name: competitions.name,
	picture: competitions.picture
};

export async function findCompetitionOption(id: number | null | undefined) {
	if (!id) return null;
	const [row] = await db.select(optionColumns).from(competitions).where(eq(competitions.id, id));
	return row ? competitionOption(row) : null;
}

/** Best name matches first, then by priority like the public site. */
export async function searchCompetitionOptions({ q, limit, offset }: OptionsQuery) {
	return db
		.select(optionColumns)
		.from(competitions)
		.where(searchWhere(q))
		.orderBy(
			...(q ? [relevance(competitions.name, q)] : []),
			desc(competitions.priority),
			asc(competitions.name)
		)
		.limit(limit)
		.offset(offset);
}
