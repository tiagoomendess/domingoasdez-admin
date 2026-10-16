import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findPlayerOption } from '#lib/server/players/index.ts';
import { parsePlayerFilter, playerSummary, playerTimeline } from '#lib/server/transfers/index.ts';
import { saveTransfer } from '#lib/server/transfers/save.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * `?player=<id>` preselects the player and shows their history next to the form, so the admin
 * sees where the new transfer goes.
 */
export const load: PageServerLoad = async ({ url }) => {
	requirePermission('transfers.create');
	const playerId = parsePlayerFilter(url);
	const [player, summary, timeline] = playerId
		? await Promise.all([
				findPlayerOption(playerId),
				playerSummary(playerId),
				playerTimeline(playerId)
			])
		: [null, null, []];
	return { player, summary, timeline, today: new Date().toISOString().slice(0, 10) };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('transfers.create');
		const result = await saveTransfer(await request.formData(), null);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: result.playerUpdated ? m.transfers_created_player() : m.transfers_created()
		});
		redirect(303, resolve('/(app)/transfers/[id=id]', { id: result.transfer.id }));
	}
};
