import { asc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';
import { containsPattern, prefixPattern, searchId } from '#lib/server/list.ts';
import type { OptionsQuery } from '#lib/server/options.ts';

type UserRow = { id: number; name: string | null; email: string | null };

export function userOption(user: UserRow): Option {
	return {
		value: user.id,
		label: user.name?.trim() || user.email || `#${user.id}`,
		description: user.email
	};
}

const optionColumns = { id: users.id, name: users.name, email: users.email };

export async function userExists(id: number): Promise<boolean> {
	return (await db.$count(users, eq(users.id, id))) > 0;
}

export async function findUserOption(id: number | null | undefined): Promise<Option | null> {
	if (!id) return null;
	const [user] = await db.select(optionColumns).from(users).where(eq(users.id, id)).limit(1);
	return user ? userOption(user) : null;
}

/**
 * Name contains the text, email starts with it (the unique email index serves the prefix), or
 * the id. Exact and prefix name matches first.
 */
export async function searchUserOptions({ q, limit, offset }: OptionsQuery) {
	let where: SQL | undefined;
	let relevance: SQL | undefined;
	if (q) {
		const id = searchId(q);
		where = or(
			like(users.name, containsPattern(q)),
			like(users.email, prefixPattern(q)),
			id ? eq(users.id, id) : undefined
		);
		relevance = sql`CASE WHEN ${users.email} = ${q} OR ${users.name} = ${q} THEN 0 WHEN ${users.name} LIKE ${prefixPattern(q)} THEN 1 ELSE 2 END`;
	}
	return db
		.select(optionColumns)
		.from(users)
		.where(where)
		.orderBy(...(relevance ? [relevance] : []), asc(users.name), asc(users.id))
		.limit(limit)
		.offset(offset);
}
