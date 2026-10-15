import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { savePartner } from '#lib/server/partners/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('partners.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('partners.create');
		const result = await savePartner(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.partners_created({ name: result.partner.name })
		});
		redirect(303, resolve('/(app)/partners/[id=id]', { id: result.partner.id }));
	}
};
