import { requirePermission } from '#lib/server/auth/guard.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('dashboard');
	// Legacy dashboard metrics (pending player update requests, unseen info reports, …) go here.
	return {};
};
