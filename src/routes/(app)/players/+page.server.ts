import { requirePermission } from '#lib/server/auth/guard.ts';
import { listPlayers } from '#lib/server/players/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('players');
	return listPlayers(url);
};
