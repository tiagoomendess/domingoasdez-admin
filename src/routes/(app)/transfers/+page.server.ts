import { requirePermission } from '#lib/server/auth/guard.ts';
import { findPlayerOption } from '#lib/server/players/index.ts';
import { listTransfers } from '#lib/server/transfers/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('transfers');
	const result = await listTransfers(url);
	// The player filter (from a player's page) is shown as a removable chip.
	return { ...result, playerFilter: await findPlayerOption(result.player) };
};
