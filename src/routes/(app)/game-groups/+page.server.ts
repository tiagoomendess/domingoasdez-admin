import { requirePermission } from '#lib/server/auth/guard.ts';
import { listGroups } from '#lib/server/game-groups/index.ts';
import { findSeasonOption } from '#lib/server/seasons/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('game_groups');
	const result = await listGroups(url);
	// The season filter (from a season's page) is shown as a removable chip.
	return { ...result, seasonFilter: await findSeasonOption(result.season) };
};
