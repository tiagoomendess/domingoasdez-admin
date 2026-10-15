import { and, eq, sql } from 'drizzle-orm';
import { ADMIN_ACCESS_PERMISSION, can } from '#lib/auth/permissions.ts';
import type { AdminUser } from '#lib/auth/user.ts';
import { db } from '#lib/server/db/index.ts';
import {
	permissions,
	userBans,
	userPermissions,
	userProfiles,
	users
} from '#lib/server/db/schema.ts';
import { profilePictureUrl } from '#lib/server/media.ts';
import { verifyPassword } from './password';

type UserRow = {
	id: number;
	name: string | null;
	email: string | null;
	password: string | null;
	verified: boolean;
	picture: string | null;
};

const userColumns = {
	id: users.id,
	name: users.name,
	email: users.email,
	password: users.password,
	verified: users.verified,
	picture: userProfiles.picture
};

async function isBanned(userId: number) {
	const [ban] = await db
		.select({ id: userBans.id })
		.from(userBans)
		.where(and(eq(userBans.bannedUserId, userId), eq(userBans.pardoned, false)))
		.limit(1);
	return Boolean(ban);
}

async function permissionNames(userId: number) {
	const rows = await db
		.select({ name: permissions.name })
		.from(userPermissions)
		.innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
		.where(eq(userPermissions.userId, userId));
	return [...new Set(rows.map((row) => row.name))].sort();
}

/**
 * Applies every rule an admin account must pass: verified, not banned and holding the
 * `dashboard` (or `admin`) permission. Re-checked on every request so revoking access is instant.
 */
async function toAdmin(row: UserRow | undefined) {
	if (!row?.email || !row.verified) return null;
	if (await isBanned(row.id)) return null;

	const granted = await permissionNames(row.id);
	if (!can(granted, ADMIN_ACCESS_PERMISSION)) return null;

	const user: AdminUser = {
		id: row.id,
		name: row.name?.trim() || row.email.split('@')[0],
		email: row.email,
		picture: profilePictureUrl(row.picture),
		permissions: granted
	};
	return { user, passwordHash: row.password };
}

export async function loadAdmin(userId: number) {
	const [row] = await db
		.select(userColumns)
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(eq(users.id, userId))
		.limit(1);
	return toAdmin(row);
}

export type LoginResult =
	{ ok: true; user: AdminUser; passwordHash: string | null } | { ok: false; userId: number | null };

/** Same opaque failure for unknown email, wrong password, unverified, banned or no access. */
export async function attemptLogin(email: string, password: string): Promise<LoginResult> {
	const normalized = email.trim().toLowerCase();
	if (!normalized || !password) return { ok: false, userId: null };

	const [row] = await db
		.select(userColumns)
		.from(users)
		.leftJoin(userProfiles, eq(userProfiles.userId, users.id))
		.where(sql`LOWER(${users.email}) = ${normalized}`)
		.limit(1);

	if (!row) return { ok: false, userId: null };
	if (!(await verifyPassword(password, row.password))) return { ok: false, userId: row.id };

	const admin = await toAdmin(row);
	return admin ? { ok: true, ...admin } : { ok: false, userId: row.id };
}
