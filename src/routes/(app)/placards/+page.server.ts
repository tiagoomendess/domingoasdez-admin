import { requirePermission } from '#lib/server/auth/guard.ts';
import { listPlacards } from '#lib/server/placards/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('placards');
	return listPlacards(url);
};
