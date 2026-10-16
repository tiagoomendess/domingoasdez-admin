import { and, asc, desc, eq, exists, like, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '#lib/server/db/index.ts';
import {
	permissions,
	socialProviders,
	userBans,
	userPermissions,
	userProfiles,
	users
} from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	prefixPattern,
	searchId
} from '#lib/server/list.ts';
import { profilePictureUrl } from '#lib/server/media.ts';

export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type UserBan = typeof userBans.$inferSelect;

export const USER_SORTS = ['id', 'name', 'email', 'created_at'] as const;

/**
 * `?status=`: the legacy list showed verified accounts only; `all`, `unverified` and `banned` are
 * new. `?has_permissions=1` (the dashboard's staff link) keeps accounts with any permission.
 */
export const USER_STATUSES = ['verified', 'unverified', 'banned', 'all'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export function parseUserFilters(url: URL) {
	const value = url.searchParams.get('status');
	const status = (USER_STATUSES as readonly string[]).includes(value ?? '')
		? (value as UserStatus)
		: 'verified';
	return { status, hasPermissions: url.searchParams.get('has_permissions') === '1' };
}

const activeBan = (userId: typeof users.id) =>
	db
		.select({ id: userBans.id })
		.from(userBans)
		.where(and(eq(userBans.bannedUserId, userId), eq(userBans.pardoned, false)));

/** Name contains the text, email starts with it (indexed), or the id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const text = or(like(users.name, containsPattern(q)), like(users.email, prefixPattern(q)));
	const id = searchId(q);
	return id ? or(eq(users.id, id), text) : text;
}

export async function listUsers(url: URL) {
	const params = parseListParams(url, USER_SORTS, { sort: 'id', dir: 'desc' });
	const { status, hasPermissions } = parseUserFilters(url);
	const where = and(
		searchWhere(params.q),
		status === 'verified' ? eq(users.verified, true) : undefined,
		status === 'unverified' ? eq(users.verified, false) : undefined,
		status === 'banned' ? exists(activeBan(users.id)) : undefined,
		hasPermissions
			? exists(
					db
						.select({ id: userPermissions.id })
						.from(userPermissions)
						.where(eq(userPermissions.userId, users.id))
				)
			: undefined
	);
	const state = listState(params, await db.$count(users, where));

	const sortColumn = {
		id: users.id,
		name: users.name,
		email: users.email,
		created_at: users.createdAt
	}[params.sort];

	const rows = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			verified: users.verified,
			createdAt: users.createdAt,
			picture: userProfiles.picture,
			permissions: db.$count(userPermissions, eq(userPermissions.userId, users.id)),
			banned: db.$count(
				userBans,
				and(eq(userBans.bannedUserId, users.id), eq(userBans.pardoned, false))
			)
		})
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(users.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({
			...row,
			picture: profilePictureUrl(row.picture),
			banned: row.banned > 0
		})),
		list: state,
		status,
		hasPermissions
	};
}

export async function findUser(id: number): Promise<User | undefined> {
	const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
	return user;
}

export async function findProfile(userId: number): Promise<UserProfile | undefined> {
	const [profile] = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.userId, userId))
		.limit(1);
	return profile;
}

/** Legacy "Login externo": the social accounts (Google, Facebook) the user signs in with. */
export async function socialLogins(userId: number) {
	const rows = await db
		.select({ provider: socialProviders.provider })
		.from(socialProviders)
		.where(eq(socialProviders.userId, userId));
	return [...new Set(rows.map((row) => row.provider))].sort();
}

/** The user's permissions, by name. */
export async function userPermissionRows(userId: number) {
	return db
		.select({ id: permissions.id, name: permissions.name })
		.from(userPermissions)
		.innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
		.where(eq(userPermissions.userId, userId))
		.orderBy(asc(permissions.name));
}

/** Every permission (64 rows), for the "add permission" select. */
export async function allPermissions() {
	return db
		.select({ id: permissions.id, name: permissions.name })
		.from(permissions)
		.orderBy(asc(permissions.name));
}

export async function findPermission(id: number) {
	const [row] = await db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
	return row;
}

const bannedBy = alias(users, 'banned_by');

/** Every ban of the user, newest first, with who banned them. */
export async function userBanHistory(userId: number) {
	return db
		.select({
			id: userBans.id,
			reason: userBans.reason,
			pardoned: userBans.pardoned,
			createdAt: userBans.createdAt,
			updatedAt: userBans.updatedAt,
			bannedById: userBans.bannedByUserId,
			bannedByName: bannedBy.name
		})
		.from(userBans)
		.leftJoin(bannedBy, eq(bannedBy.id, userBans.bannedByUserId))
		.where(eq(userBans.bannedUserId, userId))
		.orderBy(desc(userBans.createdAt), desc(userBans.id));
}

export async function activeBans(userId: number): Promise<UserBan[]> {
	return db
		.select()
		.from(userBans)
		.where(and(eq(userBans.bannedUserId, userId), eq(userBans.pardoned, false)));
}
