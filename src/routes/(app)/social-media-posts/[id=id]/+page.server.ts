import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { toLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { canRetry, postStatus } from '#lib/server/social-media-posts/form.ts';
import { findPost } from '#lib/server/social-media-posts/index.ts';
import { deletePost, retryPost, savePost } from '#lib/server/social-media-posts/save.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPost(id: number) {
	const post = await findPost(id);
	if (!post) error(404, { message: 'Not found' });
	return post;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	requirePermission('social_media_posts');
	const post = await loadPost(params.id);
	return {
		post,
		status: postStatus(post),
		publishAt: toLocalInput(post.publishAt, adminTimeZone(cookies))
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('social_media_posts.edit');
		const post = await loadPost(params.id);
		if (post.published) return fail(409, { message: m.social_posts_not_editable() });
		const result = await savePost(await request.formData(), post, adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.social_posts_saved({ id: post.id }) });
		redirect(303, resolve('/(app)/social-media-posts/[id=id]', { id: post.id }));
	},

	retry: async ({ params, cookies }) => {
		requirePermission('social_media_posts.edit');
		const post = await loadPost(params.id);
		if (!canRetry(postStatus(post))) error(409, { message: 'Nothing to retry' });
		await retryPost(post);

		setFlash(cookies, { type: 'success', message: m.social_posts_retried({ id: post.id }) });
		redirect(303, resolve('/(app)/social-media-posts/[id=id]', { id: post.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('social_media_posts.create');
		const post = await loadPost(params.id);
		await deletePost(post);

		setFlash(cookies, { type: 'success', message: m.social_posts_deleted({ id: post.id }) });
		redirect(303, resolve('/(app)/social-media-posts'));
	}
};
