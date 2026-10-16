import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { savePermission } from '#lib/server/permissions/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('permissions.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('permissions.create');
		const result = await savePermission(await request.formData(), null);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.permissions_created({ name: result.permission.name })
		});
		redirect(303, resolve('/(app)/permissions/[id=id]', { id: result.permission.id }));
	}
};
