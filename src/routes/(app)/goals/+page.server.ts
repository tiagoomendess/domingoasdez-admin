import { requirePermission } from '#lib/server/auth/guard.ts';
import { findGameOption } from '#lib/server/games/index.ts';
import { listGoals } from '#lib/server/goals/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('goals');
	const result = await listGoals(url);
	// The game filter (from a game's page) is shown as a removable chip.
	return { ...result, gameFilter: await findGameOption(result.game) };
};
