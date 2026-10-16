import { json } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import { playgroundOption, searchPlaygroundOptions } from '#lib/server/playgrounds/index.ts';
import type { RequestHandler } from './$types';

/** Playground select options (games, …). Playgrounds are public. */
export const GET: RequestHandler = async ({ url }) => {
	requirePermission('dashboard');
	const rows = await searchPlaygroundOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, playgroundOption));
};
