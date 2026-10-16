import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { saveRules } from '#lib/server/group-rules/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('group_rules.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('group_rules.create');
		const result = await saveRules(await request.formData(), null);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.group_rules_created({ name: result.rules.name })
		});
		redirect(303, resolve('/(app)/group-rules/[id=id]', { id: result.rules.id }));
	}
};
