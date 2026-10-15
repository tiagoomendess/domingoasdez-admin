import { requirePermission } from '#lib/server/auth/guard.ts';
import { listTeams } from '#lib/server/teams/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('teams');
	return listTeams(url);
};
