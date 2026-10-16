import { json } from '@sveltejs/kit';
import { requireAnyPermission } from '#lib/server/auth/guard.ts';
import { rulesOption, searchRulesOptions } from '#lib/server/group-rules/index.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import type { RequestHandler } from './$types';

/** Rules select options (game groups). */
export const GET: RequestHandler = async ({ url }) => {
	requireAnyPermission(['group_rules', 'game_groups']);
	const rows = await searchRulesOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, rulesOption));
};
