import { requirePermission } from '#lib/server/auth/guard.ts';
import { listSeasons } from '#lib/server/seasons/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('seasons');
	return listSeasons(url);
};
