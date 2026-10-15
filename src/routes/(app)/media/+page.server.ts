import { requirePermission } from '#lib/server/auth/guard.ts';
import { listMedia } from '#lib/server/media/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('media');
	return listMedia(url);
};
