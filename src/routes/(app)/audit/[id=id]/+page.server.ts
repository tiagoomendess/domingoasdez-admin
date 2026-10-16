import { error } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { diffValues, entityPath, parseValues } from '#lib/server/audit-log/diff.ts';
import { findAuditEntry } from '#lib/server/audit-log/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('admin');
	const row = await findAuditEntry(params.id);
	if (!row) error(404, { message: 'Not found' });
	const { entry } = row;
	const before = parseValues(entry.oldValues);
	const after = parseValues(entry.newValues);

	return {
		entry: {
			id: entry.id,
			action: entry.action,
			model: entry.model,
			modelId: entry.modelId,
			ipAddress: entry.ipAddress,
			ipCountry: entry.ipCountry,
			userAgent: entry.userAgent,
			timezone: entry.timezone,
			language: entry.language,
			extraInfo: entry.extraInfo,
			createdAt: entry.createdAt
		},
		user: entry.userId ? { id: entry.userId, name: row.userName, email: row.userEmail } : null,
		diff: diffValues(before.values, after.values),
		// Text that isn't a JSON object (legacy cut long values at 64 KB, breaking the JSON).
		rawBefore: before.raw,
		rawAfter: after.raw,
		entityPath: entityPath(entry.model, entry.modelId, entry.action)
	};
};
