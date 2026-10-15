import { requirePermission } from '#lib/server/auth/guard.ts';
import { listClubs } from '#lib/server/clubs/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('clubs');
	return listClubs(url);
};
