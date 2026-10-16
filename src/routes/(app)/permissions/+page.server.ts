import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { listPermissions } from '#lib/server/permissions/index.ts';
import { savePermission } from '#lib/server/permissions/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('permissions');
	return listPermissions(url);
};

export const actions: Actions = {
	/** One click for a name the admin checks but that has no row yet. */
	createMissing: async ({ request, cookies }) => {
		requirePermission('permissions.create');
		const result = await savePermission(await request.formData(), null);
		if ('failure' in result) return fail(400, { message: m.permissions_create_failed() });

		setFlash(cookies, {
			type: 'success',
			message: m.permissions_created({ name: result.permission.name })
		});
		redirect(303, resolve('/(app)/permissions'));
	}
};
