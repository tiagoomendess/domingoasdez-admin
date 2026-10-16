import { and, eq } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { userBans, userPermissions, userProfiles } from '#lib/server/db/schema.ts';
import { invalid, parseForm } from '#lib/server/forms.ts';
import {
	banFormSchema,
	canGrant,
	permissionFormSchema,
	profileFormSchema,
	SELF_LOCKOUT_PERMISSIONS
} from './form';
import { activeBans, findPermission, findProfile, type User } from './index';

/**
 * Legacy `UserProfileController@update` (picture, phone, bio). Fixed legacy bug: that route had
 * no permission check at all; it needs `users.edit` now.
 */
export async function updateProfile(formData: FormData, user: User) {
	const form = parseForm(profileFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };

	const existing = await findProfile(user.id);
	const columns = { picture: form.data.picture, phone: form.data.phone, bio: form.data.bio };
	if (!existing) {
		// One legacy account has no profile row (registration normally creates it).
		const [{ id }] = await db
			.insert(userProfiles)
			.values({ userId: user.id, ...columns })
			.$returningId();
		const [row] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
		await audit({ action: 'create', model: 'UserProfile', newValues: row });
		return { ok: true };
	}

	const changes = changedColumns(existing, columns);
	if (!Object.keys(changes).length) return { ok: true };
	await db.update(userProfiles).set(changes).where(eq(userProfiles.id, existing.id));
	const row = await findProfile(user.id);
	await audit({ action: 'update', model: 'UserProfile', oldValues: existing, newValues: row });
	return { ok: true };
}

/**
 * Legacy `addPermission`. Fixed legacy hole: anyone who could open users could grant any
 * permission, `admin` included; now an admin grants anything and others only what they hold.
 */
export async function grantPermission(formData: FormData, user: User, actor: AdminUser) {
	const form = parseForm(permissionFormSchema, formData);
	if (!form.success) return { message: m.validation_invalid() };
	const permission = await findPermission(form.data.permission_id);
	if (!permission) return { message: m.validation_not_found() };
	if (!canGrant(actor.permissions, permission.name)) {
		return { message: m.users_cannot_grant({ permission: permission.name }) };
	}

	const [already] = await db
		.select({ id: userPermissions.id })
		.from(userPermissions)
		.where(
			and(eq(userPermissions.userId, user.id), eq(userPermissions.permissionId, permission.id))
		)
		.limit(1);
	if (already) return { ok: true };

	const [{ id }] = await db
		.insert(userPermissions)
		.values({ userId: user.id, permissionId: permission.id })
		.$returningId();
	const [row] = await db.select().from(userPermissions).where(eq(userPermissions.id, id));
	await audit({
		action: 'create',
		model: 'UserPermission',
		newValues: row,
		extraInfo: `${permission.name} → ${user.email ?? user.id}`
	});
	return { ok: true, permission: permission.name };
}

/** Legacy `removePermission`. An admin can't remove their own `admin` or `dashboard`. */
export async function revokePermission(formData: FormData, user: User, actor: AdminUser) {
	const form = parseForm(permissionFormSchema, formData);
	if (!form.success) return { message: m.validation_invalid() };
	const permission = await findPermission(form.data.permission_id);
	if (!permission) return { message: m.validation_not_found() };
	if (user.id === actor.id && SELF_LOCKOUT_PERMISSIONS.includes(permission.name)) {
		return { message: m.users_cannot_revoke_own({ permission: permission.name }) };
	}
	if (!canGrant(actor.permissions, permission.name)) {
		return { message: m.users_cannot_grant({ permission: permission.name }) };
	}

	const rows = await db
		.select()
		.from(userPermissions)
		.where(
			and(eq(userPermissions.userId, user.id), eq(userPermissions.permissionId, permission.id))
		);
	if (!rows.length) return { ok: true };
	await db
		.delete(userPermissions)
		.where(
			and(eq(userPermissions.userId, user.id), eq(userPermissions.permissionId, permission.id))
		);
	for (const row of rows) {
		await audit({
			action: 'delete',
			model: 'UserPermission',
			oldValues: row,
			extraInfo: `${permission.name} → ${user.email ?? user.id}`
		});
	}
	return { ok: true, permission: permission.name };
}

/**
 * Bans the user (the legacy modal existed but its controller was empty). A ban signs them out of
 * the admin at once and blocks logins on every site (`user_bans.pardoned = 0`).
 */
export async function banUser(formData: FormData, user: User, actor: AdminUser) {
	const form = parseForm(banFormSchema, formData);
	if (!form.success) return { message: m.users_ban_reason_required() };
	if (user.id === actor.id) return { message: m.users_cannot_ban_self() };
	if ((await activeBans(user.id)).length) return { ok: true };

	const [{ id }] = await db
		.insert(userBans)
		.values({ bannedUserId: user.id, bannedByUserId: actor.id, reason: form.data.reason })
		.$returningId();
	const [row] = await db.select().from(userBans).where(eq(userBans.id, id));
	await audit({ action: 'create', model: 'UserBan', newValues: row });
	return { ok: true };
}

/** Pardons every active ban of the user (bans are kept, marked `pardoned`, as history). */
export async function pardonUser(user: User) {
	const bans = await activeBans(user.id);
	if (!bans.length) return;
	await db
		.update(userBans)
		.set({ pardoned: true })
		.where(and(eq(userBans.bannedUserId, user.id), eq(userBans.pardoned, false)));
	for (const ban of bans) {
		await audit({
			action: 'update',
			model: 'UserBan',
			oldValues: ban,
			newValues: { ...ban, pardoned: true }
		});
	}
}
