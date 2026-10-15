import { requirePermission } from '#lib/server/auth/guard.ts';
import { listRequests } from '#lib/server/player-update-requests/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('player_update_requests');
	return listRequests(url);
};
