import { eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db/index.ts';
import { permissions, userPermissions } from '#lib/server/db/schema.ts';
import { invalid, parseForm } from '#lib/server/forms.ts';
import { isUsedByCode, LOCKOUT, permissionFormSchema } from './form';
import { isPermissionNameTaken, type PermissionRow } from './index';

/**
 * Create (`existing` null) or rename a permission (legacy `PermissionController@store/update`).
 * Fixed legacy holes: names weren't unique (renaming one to `admin` made its holders admins),
 * nothing was audited, and a name the code checks could be renamed, which silently took the
 * section away from everyone holding it.
 */
export async function savePermission(formData: FormData, existing: PermissionRow | null) {
	const form = parseForm(permissionFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { name } = form.data;

	if (existing && existing.name !== name && isUsedByCode(existing.name)) {
		return { failure: invalid({ name: [m.permissions_rename_locked()] }, form.values) };
	}
	if (name !== existing?.name && (await isPermissionNameTaken(name, existing?.id))) {
		return { failure: invalid({ name: [m.permissions_name_taken()] }, form.values) };
	}
	if (existing && existing.name === name) return { permission: existing };

	let id: number;
	if (existing) {
		id = existing.id;
		await db.update(permissions).set({ name }).where(eq(permissions.id, id));
	} else {
		[{ id }] = await db.insert(permissions).values({ name }).$returningId();
	}
	const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Permission',
		oldValues: existing,
		newValues: permission
	});
	return { permission };
}

/**
 * Deletes a permission (its grants cascade: everyone loses it). `admin` and `dashboard` can't be
 * deleted: nobody could open the admin any more.
 */
export async function deletePermission(permission: PermissionRow) {
	if (LOCKOUT.includes(permission.name)) return { message: m.permissions_delete_locked() };
	const grants = await db
		.select()
		.from(userPermissions)
		.where(eq(userPermissions.permissionId, permission.id));
	await db.delete(permissions).where(eq(permissions.id, permission.id));
	for (const grant of grants) {
		await audit({ action: 'delete', model: 'UserPermission', oldValues: grant });
	}
	await audit({ action: 'delete', model: 'Permission', oldValues: permission });
	return { ok: true };
}
