import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { VARIABLE_NAME, variableKind } from '#lib/server/settings/form.ts';
import { createVariable } from '#lib/server/settings/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('admin');
	// `?name=` from the list's "missing" card: the form then fits that variable.
	const name = url.searchParams.get('name') ?? '';
	const valid = name.length <= 64 && VARIABLE_NAME.test(name);
	return { name: valid ? name : '', kind: variableKind(valid ? name : '') };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('admin');
		const result = await createVariable(await request.formData());
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.settings_created({ name: result.variable.name })
		});
		redirect(303, resolve('/(app)/settings/[name=variable]', { name: result.variable.name }));
	}
};
