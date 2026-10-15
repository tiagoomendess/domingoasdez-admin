import { can } from '#lib/auth/permissions.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { loadDashboard } from '#lib/server/dashboard.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = requirePermission('dashboard');
	return { metrics: await loadDashboard({ isAdmin: can(user.permissions, 'admin') }) };
};
