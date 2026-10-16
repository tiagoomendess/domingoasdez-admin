import { requirePermission } from '#lib/server/auth/guard.ts';
import { listBans } from '#lib/server/score-report-bans/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('score-report-bans');
	return listBans(url);
};
