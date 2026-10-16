import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { findClubOption } from '#lib/server/clubs/index.ts';
import { setFlash } from '#lib/server/flash.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { findPlayground, playgroundGameCount, surfaces } from '#lib/server/playgrounds/index.ts';
import { deletePlayground, savePlayground } from '#lib/server/playgrounds/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPlayground(id: number) {
	const playground = await findPlayground(id);
	if (!playground) error(404, { message: 'Not found' });
	return playground;
}

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('playgrounds');
	const playground = await loadPlayground(params.id);
	const [club, games, surfaceList] = await Promise.all([
		findClubOption(playground.clubId),
		playgroundGameCount(playground.id),
		surfaces()
	]);
	return {
		playground: {
			id: playground.id,
			name: playground.name,
			surface: playground.surface,
			width: playground.width,
			height: playground.height,
			capacity: playground.capacity,
			priority: playground.priority,
			obs: playground.obs,
			visible: playground.visible,
			latitude: playground.location?.lat ?? null,
			longitude: playground.location?.lng ?? null,
			updatedAt: playground.updatedAt
		},
		picture: mediaUrl(playground.picture),
		club,
		games,
		surfaces: surfaceList
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('playgrounds.edit');
		const playground = await loadPlayground(params.id);
		const result = await savePlayground(await request.formData(), playground, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.playgrounds_saved({ name: result.playground.name })
		});
		redirect(303, resolve('/(app)/playgrounds/[id=id]', { id: playground.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('playgrounds.create');
		const playground = await loadPlayground(params.id);
		const result = await deletePlayground(playground);
		if ('message' in result) return fail(409, { message: result.message });

		setFlash(cookies, {
			type: 'success',
			message: m.playgrounds_deleted({ name: playground.name })
		});
		redirect(303, resolve('/(app)/playgrounds'));
	}
};
