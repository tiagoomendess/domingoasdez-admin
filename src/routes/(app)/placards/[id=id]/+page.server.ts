import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findPlacard, placardEventRows, releasePlacard } from '#lib/server/placards/index.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPlacard(id: number) {
	const placard = await findPlacard(id);
	if (!placard) error(404, { message: 'Not found' });
	return placard;
}

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('placards');
	const placard = await loadPlacard(params.id);
	return { placard, events: await placardEventRows(placard.id) };
};

export const actions: Actions = {
	release: async ({ params, cookies }) => {
		const user = requirePermission('placards.edit');
		const placard = await loadPlacard(params.id);
		await releasePlacard(placard.id, user.id);
		await audit({
			action: 'update',
			model: 'Placard',
			oldValues: { id: placard.id, scene: placard.scene, game_id: placard.gameId },
			newValues: { id: placard.id, scene: 'pairing', game_id: null }
		});

		setFlash(cookies, { type: 'success', message: m.placards_released({ id: placard.id }) });
		redirect(303, resolve('/(app)/placards/[id=id]', { id: placard.id }));
	}
};
