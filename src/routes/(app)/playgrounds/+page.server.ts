import { requirePermission } from '#lib/server/auth/guard.ts';
import { listPlaygrounds } from '#lib/server/playgrounds/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('playgrounds');
	return listPlaygrounds(url);
};
