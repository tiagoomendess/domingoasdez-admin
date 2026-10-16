import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findGroupOption } from '#lib/server/game-groups/index.ts';
import { parseGameFilters } from '#lib/server/games/index.ts';
import { saveGame } from '#lib/server/games/save.ts';
import { refereeTypeRows } from '#lib/server/referees/index.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

/** `?group=<id>` (from a group's page or the filtered list) preselects the group. */
export const load: PageServerLoad = async ({ url }) => {
	requirePermission('games.create');
	const [group, refereeTypes] = await Promise.all([
		findGroupOption(parseGameFilters(url).group),
		refereeTypeRows()
	]);
	return { group, refereeTypes };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('games.create');
		const result = await saveGame(await request.formData(), null, adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.games_created({ id: result.game.id }) });
		redirect(303, resolve('/(app)/games/[id=id]', { id: result.game.id }));
	}
};
