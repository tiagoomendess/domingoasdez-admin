import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { saveCompetition } from '#lib/server/competitions/save.ts';
import { setFlash } from '#lib/server/flash.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('competitions.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('competitions.create');
		const result = await saveCompetition(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		const { competition } = result;
		setFlash(cookies, {
			type: 'success',
			message: m.competitions_created({ name: competition.name })
		});
		redirect(303, resolve('/(app)/competitions/[id=id]', { id: competition.id }));
	}
};
