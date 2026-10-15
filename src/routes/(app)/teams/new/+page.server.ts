import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { findClubOption } from '#lib/server/clubs/index.ts';
import { setFlash } from '#lib/server/flash.ts';
import { searchId } from '#lib/server/list.ts';
import { saveTeam } from '#lib/server/teams/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('teams.create');
	// `?club=<id>` pre-selects the club (link from a club's page).
	return { club: await findClubOption(searchId(url.searchParams.get('club') ?? '')) };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('teams.create');
		const result = await saveTeam(await request.formData(), null);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.teams_created({ name: result.team.name }) });
		redirect(303, resolve('/(app)/teams/[id=id]', { id: result.team.id }));
	}
};
