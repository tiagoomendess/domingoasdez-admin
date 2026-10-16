import { requirePermission } from '#lib/server/auth/guard.ts';
import { listInfoReports } from '#lib/server/info-reports/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('info_reports');
	return listInfoReports(url);
};
