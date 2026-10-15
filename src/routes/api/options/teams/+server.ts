import { json } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import { searchTeamOptions, teamOption } from '#lib/server/teams/index.ts';
import type { RequestHandler } from './$types';

/** Team select options (players, games, …). Team and club names are public. */
export const GET: RequestHandler = async ({ url }) => {
	requirePermission('dashboard');
	const rows = await searchTeamOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, teamOption));
};
