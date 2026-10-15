import { json } from '@sveltejs/kit';
import { mediaOption, searchCoverOptions } from '#lib/server/articles/index.ts';
import { requireAnyPermission } from '#lib/server/auth/guard.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import type { RequestHandler } from './$types';

/** Media library options (the article cover select). Searched by tags or id, newest first. */
export const GET: RequestHandler = async ({ url }) => {
	requireAnyPermission(['articles', 'media']);
	const rows = await searchCoverOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, mediaOption));
};
