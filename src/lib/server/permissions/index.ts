import { and, asc, eq, like, ne, or, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { permissions, userPermissions, users } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { isUsedByCode, missingPermissions } from './form';

export type PermissionRow = typeof permissions.$inferSelect;

export const PERMISSION_SORTS = ['id', 'name', 'users'] as const;

function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const byName = like(permissions.name, containsPattern(q));
	const id = searchId(q);
	return id ? or(eq(permissions.id, id), byName) : byName;
}

const holderCount = db.$count(userPermissions, eq(userPermissions.permissionId, permissions.id));

export async function listPermissions(url: URL) {
	// Legacy list: in creation order. By name reads better.
	const params = parseListParams(url, PERMISSION_SORTS, { sort: 'name', dir: 'asc' });
	const where = searchWhere(params.q);
	const state = listState(params, await db.$count(permissions, where));
	const sortColumn = { id: permissions.id, name: permissions.name, users: holderCount }[
		params.sort
	];
	const rows = await db
		.select({ id: permissions.id, name: permissions.name, users: holderCount })
		.from(permissions)
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(permissions.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	const all = await db.select({ name: permissions.name }).from(permissions);
	return {
		rows: rows.map((row) => ({ ...row, usedByCode: isUsedByCode(row.name) })),
		list: state,
		missing: missingPermissions(all.map((row) => row.name))
	};
}

export async function findPermissionRow(id: number): Promise<PermissionRow | undefined> {
	const [row] = await db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
	return row;
}

export async function isPermissionNameTaken(name: string, exceptId?: number) {
	const [row] = await db
		.select({ id: permissions.id })
		.from(permissions)
		.where(
			exceptId
				? and(eq(permissions.name, name), ne(permissions.id, exceptId))
				: eq(permissions.name, name)
		)
		.limit(1);
	return Boolean(row);
}

/** The accounts holding the permission. */
export async function permissionHolders(id: number) {
	return db
		.selectDistinct({ id: users.id, name: users.name, email: users.email })
		.from(userPermissions)
		.innerJoin(users, eq(users.id, userPermissions.userId))
		.where(eq(userPermissions.permissionId, id))
		.orderBy(asc(users.name));
}
