import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { findCompetitionOption } from '#lib/server/competitions/index.ts';
import { setFlash } from '#lib/server/flash.ts';
import { parseCompetitionFilter } from '#lib/server/seasons/index.ts';
import { saveSeason } from '#lib/server/seasons/save.ts';
import type { Actions, PageServerLoad } from './$types';

/** `?competition=<id>` (from a competition's page) preselects it. */
export const load: PageServerLoad = async ({ url }) => {
	requirePermission('seasons.create');
	return { competition: await findCompetitionOption(parseCompetitionFilter(url)) };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('seasons.create');
		const result = await saveSeason(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.seasons_created() });
		redirect(303, resolve('/(app)/seasons/[id=id]', { id: result.season.id }));
	}
};
