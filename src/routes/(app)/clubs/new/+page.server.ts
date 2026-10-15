import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { saveClub } from '#lib/server/clubs/save.ts';
import { setFlash } from '#lib/server/flash.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('clubs.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('clubs.create');
		const result = await saveClub(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.clubs_created({ name: result.club.name }) });
		redirect(303, resolve('/(app)/clubs/[id=id]', { id: result.club.id }));
	}
};
