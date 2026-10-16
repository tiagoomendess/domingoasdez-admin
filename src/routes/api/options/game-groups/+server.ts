import { json } from '@sveltejs/kit';
import { requireAnyPermission } from '#lib/server/auth/guard.ts';
import { groupOption, searchGroupOptions } from '#lib/server/game-groups/index.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import type { RequestHandler } from './$types';

/** Game group select options (games). */
export const GET: RequestHandler = async ({ url }) => {
	requireAnyPermission(['games', 'game_groups']);
	const rows = await searchGroupOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, groupOption));
};
