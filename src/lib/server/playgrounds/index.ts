import { asc, desc, eq, like, or } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, playgrounds } from '#lib/server/db/schema.ts';
import { containsPattern, relevance, searchId } from '#lib/server/list.ts';
import type { OptionsQuery } from '#lib/server/options.ts';

/**
 * Playground options for the game form. The playgrounds section itself is not ported yet; this is
 * the part games need.
 */

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
