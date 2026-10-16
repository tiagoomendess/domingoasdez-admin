import { requirePermission } from '#lib/server/auth/guard.ts';
import { findGroupOption } from '#lib/server/game-groups/index.ts';
import { listGames } from '#lib/server/games/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('games');
	const result = await listGames(url);
	// The group filter (from a group's page) is shown as a removable chip.
	return { ...result, groupFilter: await findGroupOption(result.group) };
};
