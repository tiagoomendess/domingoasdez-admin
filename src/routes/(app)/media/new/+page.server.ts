import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { createMedia } from '#lib/server/media/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('media.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('media.create');
		const result = await createMedia(await request.formData(), user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.media_created({ id: result.media.id }) });
		redirect(303, resolve('/(app)/media/[id=id]', { id: result.media.id }));
	}
};
