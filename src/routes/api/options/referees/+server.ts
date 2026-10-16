import { json } from '@sveltejs/kit';
import { requireAnyPermission } from '#lib/server/auth/guard.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import { refereeOption, searchRefereeOptions } from '#lib/server/referees/index.ts';
import type { RequestHandler } from './$types';

/** Referee select options (games). */
export const GET: RequestHandler = async ({ url }) => {
	requireAnyPermission(['games', 'referees']);
	const rows = await searchRefereeOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, refereeOption));
};
