import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { isUsedByCode, LOCKOUT } from '#lib/server/permissions/form.ts';
import { findPermissionRow, permissionHolders } from '#lib/server/permissions/index.ts';
import { deletePermission, savePermission } from '#lib/server/permissions/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPermission(id: number) {
	const permission = await findPermissionRow(id);
	if (!permission) error(404, { message: 'Not found' });
	return permission;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('permissions');
	const permission = await loadPermission(params.id);
	return {
		permission,
		holders: await permissionHolders(permission.id),
		usedByCode: isUsedByCode(permission.name),
		locked: LOCKOUT.includes(permission.name),
		canSeeUsers: can(user.permissions, 'users')
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('permissions.edit');
		const permission = await loadPermission(params.id);
		const result = await savePermission(await request.formData(), permission);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.permissions_saved({ name: result.permission.name })
		});
		redirect(303, resolve('/(app)/permissions/[id=id]', { id: permission.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('permissions.create');
		const permission = await loadPermission(params.id);
		const result = await deletePermission(permission);
		if ('message' in result) return fail(409, { message: result.message });

		setFlash(cookies, {
			type: 'success',
			message: m.permissions_deleted({ name: permission.name })
		});
		redirect(303, resolve('/(app)/permissions'));
	}
};
