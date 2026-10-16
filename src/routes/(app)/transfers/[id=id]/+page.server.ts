import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { resolvePath } from '#lib/paths.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findTeamOption } from '#lib/server/teams/index.ts';
import { findTransfer, playerSummary, playerTimeline } from '#lib/server/transfers/index.ts';
import { deleteTransfer, saveTransfer } from '#lib/server/transfers/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadTransfer(id: number) {
	const transfer = await findTransfer(id);
	if (!transfer) error(404, { message: 'Not found' });
	return transfer;
}

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('transfers');
	const transfer = await loadTransfer(params.id);
	const [team, summary, timeline] = await Promise.all([
		findTeamOption(transfer.teamId),
		playerSummary(transfer.playerId),
		playerTimeline(transfer.playerId)
	]);
	return {
		transfer: {
			id: transfer.id,
			playerId: transfer.playerId,
			date: transfer.date.toISOString().slice(0, 10),
			visible: transfer.visible
		},
		team,
		summary,
		timeline
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('transfers.edit');
		const transfer = await loadTransfer(params.id);
		const result = await saveTransfer(await request.formData(), transfer);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: result.playerUpdated ? m.transfers_saved_player() : m.transfers_saved()
		});
		redirect(303, resolve('/(app)/transfers/[id=id]', { id: transfer.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('transfers.create');
		const transfer = await loadTransfer(params.id);
		const result = await deleteTransfer(transfer);
		if ('message' in result) return fail(409, { message: result.message });

		setFlash(cookies, { type: 'success', message: m.transfers_deleted() });
		// Back to the rest of the player's history.
		redirect(303, resolvePath(`/transfers?player=${transfer.playerId}`));
	}
};
