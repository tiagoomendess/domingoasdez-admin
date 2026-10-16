import { requirePermission } from '#lib/server/auth/guard.ts';
import { listCompetitions } from '#lib/server/competitions/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('competitions');
	return listCompetitions(url);
};
