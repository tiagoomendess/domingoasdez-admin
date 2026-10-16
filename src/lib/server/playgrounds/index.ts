import { asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { db } from '#lib/server/db/index.ts';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { clubs, games, playgrounds } from '#lib/server/db/schema.ts';
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

/** Playgrounds (`/playgrounds`) and the playground select of the game form. */

type PlaygroundRow = { id: number; name: string; clubName: string | null };

export const playgroundOption = (row: PlaygroundRow): Option => ({
	value: row.id,
	label: row.name,
	description: row.clubName
});

const optionColumns = { id: playgrounds.id, name: playgrounds.name, clubName: clubs.name };

export async function findPlaygroundOption(id: number | null | undefined) {
	if (!id) return null;
	const [row] = await db
		.select(optionColumns)
		.from(playgrounds)
		.leftJoin(clubs, eq(clubs.id, playgrounds.clubId))
		.where(eq(playgrounds.id, id));
	return row ? playgroundOption(row) : null;
}

/** By playground or club name; the most used (priority) first. */
export async function searchPlaygroundOptions({ q, limit, offset }: OptionsQuery) {
	const pattern = containsPattern(q);
	const id = searchId(q);
	return db
		.select(optionColumns)
		.from(playgrounds)
		.leftJoin(clubs, eq(clubs.id, playgrounds.clubId))
		.where(
			q
				? or(
						like(playgrounds.name, pattern),
						like(clubs.name, pattern),
						id ? eq(playgrounds.id, id) : undefined
					)
				: undefined
		)
		.orderBy(
			...(q ? [relevance(playgrounds.name, q)] : []),
			desc(playgrounds.priority),
			asc(playgrounds.name)
		)
		.limit(limit)
		.offset(offset);
}

export async function playgroundExists(id: number) {
	return (await db.$count(playgrounds, eq(playgrounds.id, id))) > 0;
}

export type Playground = typeof playgrounds.$inferSelect;

export const PLAYGROUND_SORTS = ['id', 'name', 'club', 'priority', 'games', 'updated_at'] as const;

/** Playground or club name, surface, or the id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const id = searchId(q);
	return or(
		like(playgrounds.name, pattern),
		like(clubs.name, pattern),
		like(playgrounds.surface, pattern),
		id ? eq(playgrounds.id, id) : undefined
	);
}

const gameCount = db.$count(games, eq(games.playgroundId, playgrounds.id));

export async function listPlaygrounds(url: URL) {
	const params = parseListParams(url, PLAYGROUND_SORTS, { sort: 'id', dir: 'desc' });
	const where = searchWhere(params.q);
	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(playgrounds)
		.leftJoin(clubs, eq(clubs.id, playgrounds.clubId))
		.where(where);
	const state = listState(params, total);
	const sortColumn = {
		id: playgrounds.id,
		name: playgrounds.name,
		club: clubs.name,
		priority: playgrounds.priority,
		games: gameCount,
		updated_at: playgrounds.updatedAt
	}[params.sort];

	const rows = await db
		.select({
			id: playgrounds.id,
			name: playgrounds.name,
			surface: playgrounds.surface,
			picture: playgrounds.picture,
			priority: playgrounds.priority,
			visible: playgrounds.visible,
			hasLocation: sql<number>`${playgrounds.location} IS NOT NULL`.mapWith(Number),
			updatedAt: playgrounds.updatedAt,
			games: gameCount,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(playgrounds)
		.leftJoin(clubs, eq(clubs.id, playgrounds.clubId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(playgrounds.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({
			...row,
			picture: mediaUrl(row.picture),
			hasLocation: Boolean(row.hasLocation),
			clubEmblem: row.clubName ? emblemUrl(row.clubEmblem) : null
		})),
		list: state
	};
}

export async function findPlayground(id: number): Promise<Playground | undefined> {
	const [row] = await db.select().from(playgrounds).where(eq(playgrounds.id, id)).limit(1);
	return row;
}

export async function playgroundGameCount(id: number) {
	return db.$count(games, eq(games.playgroundId, id));
}

/** The surfaces already used, for the field's suggestions (legacy had an autocomplete). */
export async function surfaces(): Promise<string[]> {
	const rows = await db
		.selectDistinct({ surface: playgrounds.surface })
		.from(playgrounds)
		.orderBy(asc(playgrounds.surface));
	return rows.map((row) => row.surface).filter(Boolean);
}
