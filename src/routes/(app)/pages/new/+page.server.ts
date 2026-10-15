import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { savePage } from '#lib/server/pages/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('pages.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('pages.create');
		const result = await savePage(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.pages_created({ title: result.page.title }) });
		redirect(303, resolve('/(app)/pages/[id=id]', { id: result.page.id }));
	}
};
