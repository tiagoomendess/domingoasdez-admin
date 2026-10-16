import { requirePermission } from '#lib/server/auth/guard.ts';
import { listRules } from '#lib/server/group-rules/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('group_rules');
	return listRules(url);
};
