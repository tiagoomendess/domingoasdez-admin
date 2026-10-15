import { json } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { clubOption, searchClubOptions } from '#lib/server/clubs/index.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import type { RequestHandler } from './$types';

/**
 * Club select options. Many sections pick a club (teams, playgrounds, games, …) and names and
 * emblems are public, so any admin may search them.
 */
export const GET: RequestHandler = async ({ url }) => {
	requirePermission('dashboard');
	const rows = await searchClubOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, clubOption));
};
