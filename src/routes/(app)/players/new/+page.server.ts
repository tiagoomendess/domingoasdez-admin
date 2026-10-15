import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { savePlayer } from '#lib/server/players/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('players.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('players.create');
		const result = await savePlayer(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.players_created({ name: result.player.name })
		});
		redirect(303, resolve('/(app)/players/[id=id]', { id: result.player.id }));
	}
};
