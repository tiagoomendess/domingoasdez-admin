import { requirePermission } from '#lib/server/auth/guard.ts';
import { auditModels, listAudit } from '#lib/server/audit-log/index.ts';
import { findUserOption } from '#lib/server/users.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('admin');
	const result = await listAudit(url);
	const [models, user] = await Promise.all([auditModels(), findUserOption(result.filters.userId)]);
	return { ...result, models, user };
};
