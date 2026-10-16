import { json } from '@sveltejs/kit';
import { requireAnyPermission } from '#lib/server/auth/guard.ts';
import { gameOption, searchGameOptions } from '#lib/server/games/index.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import type { RequestHandler } from './$types';

/** Game select options (flash interviews, goals, …). */
export const GET: RequestHandler = async ({ url }) => {
	requireAnyPermission(['games', 'goals']);
	const rows = await searchGameOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, gameOption));
};
