import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findGameOption } from '#lib/server/games/index.ts';
import { parseGameFilter } from '#lib/server/goals/index.ts';
import { saveGoal } from '#lib/server/goals/save.ts';
import type { Actions, PageServerLoad } from './$types';

/** Legacy `create?game_id=&team_id=`: `?game=<id>&side=home|away` preselect them. */
export const load: PageServerLoad = async ({ url }) => {
	requirePermission('goals.create');
	const side = url.searchParams.get('side');
	return {
		game: await findGameOption(parseGameFilter(url)),
		side: side === 'away' ? ('away' as const) : ('home' as const)
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('goals.create');
		const result = await saveGoal(await request.formData(), null);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.goals_created() });
		// Back to the game's goals: they are usually added one after the other.
		redirect(303, resolve('/(app)/goals/[id=id]', { id: result.goal.id }));
	}
};
