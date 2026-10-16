import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { findClubOption } from '#lib/server/clubs/index.ts';
import { setFlash } from '#lib/server/flash.ts';
import { surfaces } from '#lib/server/playgrounds/index.ts';
import { savePlayground } from '#lib/server/playgrounds/save.ts';
import type { Actions, PageServerLoad } from './$types';

/** `?club=<id>` (from a club's page) preselects the club. */
export const load: PageServerLoad = async ({ url }) => {
	requirePermission('playgrounds.create');
	const clubId = Number(url.searchParams.get('club'));
	return {
		club: Number.isInteger(clubId) && clubId > 0 ? await findClubOption(clubId) : null,
		surfaces: await surfaces()
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('playgrounds.create');
		const result = await savePlayground(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.playgrounds_created({ name: result.playground.name })
		});
		redirect(303, resolve('/(app)/playgrounds/[id=id]', { id: result.playground.id }));
	}
};
