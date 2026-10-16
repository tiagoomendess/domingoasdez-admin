import { json } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { competitionOption, searchCompetitionOptions } from '#lib/server/competitions/index.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import type { RequestHandler } from './$types';

/** Competition select options (seasons, …). Competition names and logos are public. */
export const GET: RequestHandler = async ({ url }) => {
	requirePermission('dashboard');
	const rows = await searchCompetitionOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, competitionOption));
};
