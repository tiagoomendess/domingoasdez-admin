import { and, asc, eq, like, ne, or, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { db } from '#lib/server/db/index.ts';
import { gameGroups, groupRules, groupRulesPositions } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	relevance,
	searchId
} from '#lib/server/list.ts';
import type { OptionsQuery } from '#lib/server/options.ts';

export type GroupRules = typeof groupRules.$inferSelect;
export type GroupRulesPosition = typeof groupRulesPositions.$inferSelect;

export const RULE_SORTS = ['id', 'name', 'type', 'groups', 'updated_at'] as const;

function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const byName = like(groupRules.name, containsPattern(q));
	const id = searchId(q);
	return id ? or(eq(groupRules.id, id), byName) : byName;
}

const groupCount = db.$count(gameGroups, eq(gameGroups.groupRulesId, groupRules.id));

export async function listRules(url: URL) {
	const params = parseListParams(url, RULE_SORTS, { sort: 'id', dir: 'desc' });
	const where = searchWhere(params.q);
	const state = listState(params, await db.$count(groupRules, where));
	const sortColumn = {
		id: groupRules.id,
		name: groupRules.name,
		type: groupRules.type,
		groups: groupCount,
		updated_at: groupRules.updatedAt
	}[params.sort];

	const rows = await db
		.select({
			id: groupRules.id,
			name: groupRules.name,
			type: groupRules.type,
			promotes: groupRules.promotes,
			relegates: groupRules.relegates,
			script: groupRules.tieBreakerScript,
			groups: groupCount,
			updatedAt: groupRules.updatedAt
		})
		.from(groupRules)
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(groupRules.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));
	return { rows, list: state };
}

export async function findRules(id: number): Promise<GroupRules | undefined> {
	const [row] = await db.select().from(groupRules).where(eq(groupRules.id, id)).limit(1);
	return row;
}

export async function rulesPositions(id: number): Promise<GroupRulesPosition[]> {
	return db
		.select()
		.from(groupRulesPositions)
		.where(eq(groupRulesPositions.groupRulesId, id))
		.orderBy(asc(groupRulesPositions.id));
}

export async function rulesGroupCount(id: number) {
	return db.$count(gameGroups, eq(gameGroups.groupRulesId, id));
}

/** `group_rules_name_unique`: legacy never checked it, so a repeated name failed in SQL. */
export async function isRulesNameTaken(name: string, exceptId?: number) {
	const [row] = await db
		.select({ id: groupRules.id })
		.from(groupRules)
		.where(
			exceptId
				? and(eq(groupRules.name, name), ne(groupRules.id, exceptId))
				: eq(groupRules.name, name)
		)
		.limit(1);
	return Boolean(row);
}

export async function rulesExist(id: number) {
	return (await db.$count(groupRules, eq(groupRules.id, id))) > 0;
}

export const rulesOption = (row: Pick<GroupRules, 'id' | 'name' | 'type'>): Option => ({
	value: row.id,
	label: row.name,
	description: row.type
});

const optionColumns = { id: groupRules.id, name: groupRules.name, type: groupRules.type };

export async function findRulesOption(id: number | null | undefined) {
	if (!id) return null;
	const [row] = await db.select(optionColumns).from(groupRules).where(eq(groupRules.id, id));
	return row ? rulesOption(row) : null;
}

export async function searchRulesOptions({ q, limit, offset }: OptionsQuery) {
	return db
		.select(optionColumns)
		.from(groupRules)
		.where(searchWhere(q))
		.orderBy(...(q ? [relevance(groupRules.name, q)] : []), asc(groupRules.name))
		.limit(limit)
		.offset(offset);
}
