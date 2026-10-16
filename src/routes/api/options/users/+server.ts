import { json } from '@sveltejs/kit';
import { requireAnyPermission } from '#lib/server/auth/guard.ts';
import { parseOptionsQuery, toOptionsPage } from '#lib/server/options.ts';
import { searchUserOptions, userOption } from '#lib/server/users.ts';
import type { RequestHandler } from './$types';

/**
 * User select options (name + email). Emails are personal data: only for the sections whose
 * forms pick a user. Add a section's permissions here when its form needs this select.
 */
export const GET: RequestHandler = async ({ url }) => {
	requireAnyPermission(['users', 'clubs.create', 'clubs.edit', 'score-report-bans.create']);
	const rows = await searchUserOptions(parseOptionsQuery(url));
	return json(toOptionsPage(rows, userOption));
};
