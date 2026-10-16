import { PUBLIC_FRONTEND_URL } from '$app/env/public';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { commentPath, listComments } from '#lib/server/game-comments/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('games');
	const result = await listComments(url);
	return {
		...result,
		// The club's link (with the PIN), as the legacy "copy link" button.
		rows: result.rows.map(({ uuid, pin, ...row }) => ({
			...row,
			link: `${PUBLIC_FRONTEND_URL}${commentPath({ uuid, pin })}`
		}))
	};
};
