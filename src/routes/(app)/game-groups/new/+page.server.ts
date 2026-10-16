import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { parseSeasonFilter } from '#lib/server/game-groups/index.ts';
import { saveGroup } from '#lib/server/game-groups/save.ts';
import { findSeasonOption } from '#lib/server/seasons/index.ts';
import type { Actions, PageServerLoad } from './$types';

/** `?season=<id>` (from a season's page) preselects it. */
export const load: PageServerLoad = async ({ url }) => {
	requirePermission('game_groups.create');
	return { season: await findSeasonOption(parseSeasonFilter(url)) };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('game_groups.create');
		const result = await saveGroup(await request.formData(), null);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.game_groups_created({ name: result.group.name ?? '' })
		});
		redirect(303, resolve('/(app)/game-groups/[id=id]', { id: result.group.id }));
	}
};
