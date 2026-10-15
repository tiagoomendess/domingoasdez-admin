import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { saveArticle } from '#lib/server/articles/save.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('articles.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('articles.create');
		const result = await saveArticle(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.articles_created({ title: result.article.title })
		});
		redirect(303, resolve('/(app)/articles/[id=id]', { id: result.article.id }));
	}
};
