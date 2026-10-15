import { requirePermission } from '#lib/server/auth/guard.ts';
import { listPartners } from '#lib/server/partners/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('partners');
	return listPartners(url);
};
