import { requirePermission } from '#lib/server/auth/guard.ts';
import { listPosts } from '#lib/server/social-media-posts/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('social_media_posts');
	return listPosts(url);
};
