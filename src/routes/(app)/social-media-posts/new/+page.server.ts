import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { toLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { savePost } from '#lib/server/social-media-posts/save.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

const HOUR = 60 * 60 * 1000;

export const load: PageServerLoad = async ({ cookies }) => {
	requirePermission('social_media_posts.create');
	// Next full hour, in the admin's timezone.
	const nextHour = new Date(Math.ceil((Date.now() + 1) / HOUR) * HOUR);
	return { publishAt: toLocalInput(nextHour, adminTimeZone(cookies)) };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('social_media_posts.create');
		const result = await savePost(await request.formData(), null, adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.social_posts_created({ id: result.post.id }) });
		redirect(303, resolve('/(app)/social-media-posts/[id=id]', { id: result.post.id }));
	}
};
