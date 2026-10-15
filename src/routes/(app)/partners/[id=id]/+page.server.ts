import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { partners } from '#lib/server/db/schema.ts';
import { setFlash } from '#lib/server/flash.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { findPartner, partnerClickCount } from '#lib/server/partners/index.ts';
import { savePartner } from '#lib/server/partners/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPartner(id: number) {
	const partner = await findPartner(id);
	if (!partner) error(404, { message: 'Not found' });
	return partner;
}

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('partners');
	const partner = await loadPartner(params.id);
	return {
		partner,
		picture: mediaUrl(partner.picture) ?? '',
		clicks: await partnerClickCount(partner.id)
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('partners.edit');
		const partner = await loadPartner(params.id);
		const result = await savePartner(await request.formData(), partner, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.partners_saved({ name: result.partner.name })
		});
		redirect(303, resolve('/(app)/partners/[id=id]', { id: partner.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('partners.create');
		const partner = await loadPartner(params.id);
		// As on the legacy site, the clicks stay (no foreign key) and so does the picture, which
		// is also in the media library.
		await db.delete(partners).where(eq(partners.id, partner.id));
		await audit({ action: 'delete', model: 'Partner', oldValues: partner });

		setFlash(cookies, { type: 'success', message: m.partners_deleted({ name: partner.name }) });
		redirect(303, resolve('/(app)/partners'));
	}
};
