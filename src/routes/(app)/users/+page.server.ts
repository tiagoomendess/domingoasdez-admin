import { requirePermission } from '#lib/server/auth/guard.ts';
import { listUsers } from '#lib/server/users/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('users');
	return listUsers(url);
};
