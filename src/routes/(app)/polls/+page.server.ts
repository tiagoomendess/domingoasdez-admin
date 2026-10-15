import { requirePermission } from '#lib/server/auth/guard.ts';
import { listPolls } from '#lib/server/polls/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('polls');
	return listPolls(url);
};
