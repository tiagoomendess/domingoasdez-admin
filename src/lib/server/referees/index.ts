import { asc, eq, inArray, like, or } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { db } from '#lib/server/db/index.ts';
import { referees, refereeTypes } from '#lib/server/db/schema.ts';
import { containsPattern, relevance, searchId } from '#lib/server/list.ts';
import { profilePictureUrl } from '#lib/server/media.ts';
import type { OptionsQuery } from '#lib/server/options.ts';

/**
 * Referee options for the game form. The referees section itself is not ported yet; this is the
 * part games need (searchable select, existence check).
 */

type RefereeRow = { id: number; name: string; picture: string | null; association: string };

export const refereeOption = (row: RefereeRow): Option => ({
	value: row.id,
	label: row.name,
	description: row.association !== 'none' ? row.association : null,
	image: profilePictureUrl(row.picture)
});

const optionColumns = {
	id: referees.id,
	name: referees.name,
	picture: referees.picture,
	association: referees.association
};

export async function findRefereeOptions(ids: number[]): Promise<Map<number, Option>> {
	if (!ids.length) return new Map();
	const rows = await db.select(optionColumns).from(referees).where(inArray(referees.id, ids));
	return new Map(rows.map((row) => [row.id, refereeOption(row)]));
}

export async function searchRefereeOptions({ q, limit, offset }: OptionsQuery) {
	const id = searchId(q);
	return db
		.select(optionColumns)
		.from(referees)
		.where(
			q
				? or(like(referees.name, containsPattern(q)), id ? eq(referees.id, id) : undefined)
				: undefined
		)
		.orderBy(...(q ? [relevance(referees.name, q)] : []), asc(referees.name))
		.limit(limit)
		.offset(offset);
}

/** Of `ids`, those that exist. */
export async function existingRefereeIds(ids: number[]): Promise<Set<number>> {
	if (!ids.length) return new Set();
	const rows = await db.select({ id: referees.id }).from(referees).where(inArray(referees.id, ids));
	return new Set(rows.map((row) => row.id));
}

/** The roles (main, assistant, …): 6 legacy rows. */
export async function refereeTypeRows() {
	return db
		.select({ id: refereeTypes.id, name: refereeTypes.name })
		.from(refereeTypes)
		.orderBy(asc(refereeTypes.id));
}
