import { requirePermission } from '#lib/server/auth/guard.ts';
import { listVariables } from '#lib/server/settings/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('admin');
	const q = url.searchParams.get('q')?.trim() ?? '';
	return { ...(await listVariables(q)), q };
};
