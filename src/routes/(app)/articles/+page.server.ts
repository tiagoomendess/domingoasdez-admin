import { listArticles } from '#lib/server/articles/index.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('articles');
	return listArticles(url);
};
