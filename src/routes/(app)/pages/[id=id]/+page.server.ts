import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { pages } from '#lib/server/db/schema.ts';
import { setFlash } from '#lib/server/flash.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { findPage } from '#lib/server/pages/index.ts';
import { savePage } from '#lib/server/pages/save.ts';
import { editorHtml } from '#lib/server/rich-text.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPage(id: number) {
	const page = await findPage(id);
	if (!page) error(404, { message: 'Not found' });
	return page;
}

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('pages');
	const page = await loadPage(params.id);
	return {
		page: {
			id: page.id,
			title: page.title,
			name: page.name,
			slug: page.slug,
			body: editorHtml(page.body),
			visible: page.visible,
			updatedAt: page.updatedAt
		},
		picture: mediaUrl(page.picture)
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('pages.edit');
		const page = await loadPage(params.id);
		const result = await savePage(await request.formData(), page, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.pages_saved({ title: result.page.title }) });
		redirect(303, resolve('/(app)/pages/[id=id]', { id: page.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('pages.create');
		const page = await loadPage(params.id);
		// The picture stays in the media library, like on the legacy site.
		await db.delete(pages).where(eq(pages.id, page.id));
		await audit({ action: 'delete', model: 'Page', oldValues: page });

		setFlash(cookies, { type: 'success', message: m.pages_deleted({ title: page.title }) });
		redirect(303, resolve('/(app)/pages'));
	}
};
