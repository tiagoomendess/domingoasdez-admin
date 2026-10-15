import { and, asc, desc, eq, inArray, like, ne, or, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, games, playgrounds, teams } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	relevance,
	searchId
} from '#lib/server/list.ts';
import { DEFAULT_EMBLEM, mediaUrl } from '#lib/server/media.ts';
import type { OptionsQuery } from '#lib/server/options.ts';

export type Club = typeof clubs.$inferSelect;

export const CLUB_SORTS = ['id', 'name', 'priority', 'teams', 'updated_at'] as const;

/** Display URL of an emblem, or the legacy default emblem. */
export function emblemUrl(path: string | null | undefined): string {
	return mediaUrl(path) ?? (mediaUrl(DEFAULT_EMBLEM) as string);
}

/** Club name, or its id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const byName = like(clubs.name, containsPattern(q));
	const id = searchId(q);
	return id ? or(eq(clubs.id, id), byName) : byName;
}

// `$count` keeps the correlated condition qualified: a plain sql`` subquery in a single-table
// select gets its columns unqualified (`club_id = id`), which counts the wrong rows.
const teamCount = db.$count(teams, eq(teams.clubId, clubs.id));

export async function listClubs(url: URL) {
	const params = parseListParams(url, CLUB_SORTS, { sort: 'id', dir: 'desc' });
	const where = searchWhere(params.q);
	const state = listState(params, await db.$count(clubs, where));

	const sortColumn = {
		id: clubs.id,
		name: clubs.name,
		priority: clubs.priority,
		teams: teamCount,
		updated_at: clubs.updatedAt
	}[params.sort];

	const rows = await db
		.select({
			id: clubs.id,
			name: clubs.name,
			emblem: clubs.emblem,
			visible: clubs.visible,
			priority: clubs.priority,
			teams: teamCount,
			createdAt: clubs.createdAt,
			updatedAt: clubs.updatedAt
		})
		.from(clubs)
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(clubs.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return { rows: rows.map((row) => ({ ...row, emblem: emblemUrl(row.emblem) })), list: state };
}

export async function findClub(id: number): Promise<Club | undefined> {
	const [club] = await db.select().from(clubs).where(eq(clubs.id, id)).limit(1);
	return club;
}

export async function clubTeams(clubId: number) {
	return db
		.select({ id: teams.id, name: teams.name, visible: teams.visible })
		.from(teams)
		.where(eq(teams.clubId, clubId))
		.orderBy(asc(teams.name), asc(teams.id));
}

/** What a delete removes with the club (teams, their games and the playgrounds cascade). */
export async function clubUsage(clubId: number) {
	const clubTeamIds = db.select({ id: teams.id }).from(teams).where(eq(teams.clubId, clubId));
	const [teamCount, gameCount, playgroundCount] = await Promise.all([
		db.$count(teams, eq(teams.clubId, clubId)),
		db.$count(
			games,
			or(inArray(games.homeTeamId, clubTeamIds), inArray(games.awayTeamId, clubTeamIds))
		),
		db.$count(playgrounds, eq(playgrounds.clubId, clubId))
	]);
	return { teams: teamCount, games: gameCount, playgrounds: playgroundCount };
}

/** Legacy `unique:clubs,name` (case-insensitive with the table collation). */
export async function isClubNameTaken(name: string, exceptId?: number): Promise<boolean> {
	const [row] = await db
		.select({ id: clubs.id })
		.from(clubs)
		.where(exceptId ? and(eq(clubs.name, name), ne(clubs.id, exceptId)) : eq(clubs.name, name))
		.limit(1);
	return Boolean(row);
}

export async function clubExists(id: number): Promise<boolean> {
	return (await db.$count(clubs, eq(clubs.id, id))) > 0;
}

export function clubOption(club: Pick<Club, 'id' | 'name' | 'emblem'>): Option {
	return { value: club.id, label: club.name, image: emblemUrl(club.emblem) };
}

export async function findClubOption(id: number | null | undefined): Promise<Option | null> {
	if (!id) return null;
	const [club] = await db
		.select({ id: clubs.id, name: clubs.name, emblem: clubs.emblem })
		.from(clubs)
		.where(eq(clubs.id, id))
		.limit(1);
	return club ? clubOption(club) : null;
}

/** Options of the club select: best name matches first, then by priority like the public site. */
export async function searchClubOptions({ q, limit, offset }: OptionsQuery) {
	return db
		.select({ id: clubs.id, name: clubs.name, emblem: clubs.emblem })
		.from(clubs)
		.where(searchWhere(q))
		.orderBy(
			...(q ? [relevance(clubs.name, q)] : []),
			desc(clubs.priority),
			asc(clubs.name),
			asc(clubs.id)
		)
		.limit(limit)
		.offset(offset);
}
