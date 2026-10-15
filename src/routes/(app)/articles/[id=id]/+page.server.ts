import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { articleDateValue } from '#lib/server/articles/form.ts';
import {
	authorName,
	findArticle,
	findCoverMedia,
	mediaOption,
	type Article
} from '#lib/server/articles/index.ts';
import { saveArticle } from '#lib/server/articles/save.ts';
import { audit } from '#lib/server/audit.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { articles } from '#lib/server/db/schema.ts';
import { setFlash } from '#lib/server/flash.ts';
import { editorHtml } from '#lib/server/rich-text.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadArticle(id: number) {
	const article = await findArticle(id);
	if (!article) error(404, { message: 'Not found' });
	return article;
}

/** Legacy: only the author or an admin may change or delete an article. */
const isOwnerOrAdmin = (user: AdminUser, article: Article) =>
	article.userId === user.id || can(user.permissions, 'admin');

function requireOwnerOrAdmin(user: AdminUser, article: Article) {
	if (!isOwnerOrAdmin(user, article)) error(403, { message: 'Forbidden' });
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('articles');
	const article = await loadArticle(params.id);
	const [author, cover] = await Promise.all([
		authorName(article.userId),
		findCoverMedia(article.mediaId)
	]);
	const owner = isOwnerOrAdmin(user, article);
	return {
		article: {
			id: article.id,
			title: article.title,
			description: article.description,
			text: editorHtml(article.text),
			date: articleDateValue(article.date),
			tags: article.tags,
			visible: article.visible,
			createdAt: article.createdAt,
			updatedAt: article.updatedAt
		},
		author,
		cover: cover ? mediaOption(cover) : null,
		canEdit: owner && can(user.permissions, 'articles.edit'),
		canDelete: owner && can(user.permissions, 'articles.create')
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('articles.edit');
		const article = await loadArticle(params.id);
		requireOwnerOrAdmin(user, article);
		const result = await saveArticle(await request.formData(), article, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.articles_saved({ title: result.article.title })
		});
		redirect(303, resolve('/(app)/articles/[id=id]', { id: article.id }));
	},

	delete: async ({ params, cookies }) => {
		const user = requirePermission('articles.create');
		const article = await loadArticle(params.id);
		requireOwnerOrAdmin(user, article);
		// The cover stays in the media library, like on the legacy site.
		await db.delete(articles).where(eq(articles.id, article.id));
		await audit({ action: 'delete', model: 'Article', oldValues: article });

		setFlash(cookies, { type: 'success', message: m.articles_deleted({ title: article.title }) });
		redirect(303, resolve('/(app)/articles'));
	}
};
