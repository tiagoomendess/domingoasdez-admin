import { requirePermission } from '#lib/server/auth/guard.ts';
import { listPages } from '#lib/server/pages/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('pages');
	return listPages(url);
};
