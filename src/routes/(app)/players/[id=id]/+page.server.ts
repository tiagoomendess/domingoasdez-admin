import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { isRowReferencedError } from '#lib/server/db/errors.ts';
import { players } from '#lib/server/db/schema.ts';
import { setFlash } from '#lib/server/flash.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { birthDateInput } from '#lib/server/players/form.ts';
import { findPlayer, playerTransfers, playerUsage } from '#lib/server/players/index.ts';
import { savePlayer } from '#lib/server/players/save.ts';
import { findTeamOption } from '#lib/server/teams/index.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPlayer(id: number) {
	const player = await findPlayer(id);
	if (!player) error(404, { message: 'Not found' });
	return player;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('players');
	const player = await loadPlayer(params.id);
	const [team, transfers, usage] = await Promise.all([
		findTeamOption(player.teamId),
		playerTransfers(player.id),
		can(user.permissions, 'players.create') ? playerUsage(player.id) : null
	]);
	return {
		player: {
			id: player.id,
			name: player.name,
			nickname: player.nickname,
			associationId: player.associationId,
			position: player.position,
			birthDate: birthDateInput(player.birthDate),
			phone: player.phone,
			email: player.email,
			facebookProfile: player.facebookProfile,
			obs: player.obs,
			visible: player.visible,
			createdAt: player.createdAt,
			updatedAt: player.updatedAt
		},
		picture: mediaUrl(player.picture),
		team,
		transfers,
		usage
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('players.edit');
		const player = await loadPlayer(params.id);
		const result = await savePlayer(await request.formData(), player, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.players_saved({ name: result.player.name }) });
		redirect(303, resolve('/(app)/players/[id=id]', { id: player.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('players.create');
		const player = await loadPlayer(params.id);
		// Goals, MVP votes, transfers and update requests cascade; the picture stays in the media
		// library, like on the legacy site.
		try {
			await db.delete(players).where(eq(players.id, player.id));
		} catch (cause) {
			if (isRowReferencedError(cause)) return fail(409, { message: m.form_delete_in_use() });
			throw cause;
		}
		await audit({ action: 'delete', model: 'Player', oldValues: player });

		setFlash(cookies, { type: 'success', message: m.players_deleted({ name: player.name }) });
		redirect(303, resolve('/(app)/players'));
	}
};
