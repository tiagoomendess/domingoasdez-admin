import { json } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import { searchSeasonOptions, seasonOption } from '#lib/server/seasons/index.ts';
import type { RequestHandler } from './$types';

/** Season select options (game groups, games, …). Seasons are public. */
export const GET: RequestHandler = async ({ url }) => {
	requirePermission('dashboard');
	const rows = await searchSeasonOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, seasonOption));
};
