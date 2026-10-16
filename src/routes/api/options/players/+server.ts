import { json } from '@sveltejs/kit';
import { requireAnyPermission } from '#lib/server/auth/guard.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import { playerOption, searchPlayerOptions } from '#lib/server/players/index.ts';
import type { RequestHandler } from './$types';

/** Player select options (coaches, goals, …). Players are personal data: a section that uses them. */
export const GET: RequestHandler = async ({ url }) => {
	requireAnyPermission(['players', 'team_agents', 'goals']);
	const rows = await searchPlayerOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, playerOption));
};
