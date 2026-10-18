import { error, json } from '@sveltejs/kit';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { reportStatusSchema } from '#lib/server/today/form.ts';
import { setReportStatus } from '#lib/server/today/save.ts';
import type { RequestHandler } from './$types';

/** Mark a score report unknown / correct / fake. Legacy allowed it to `admin` only. */
export const PUT: RequestHandler = async ({ params, request }) => {
	requirePermission('admin');
	const body = reportStatusSchema.safeParse(await request.json().catch(() => null));
	if (!body.success) error(400, { message: 'Invalid status' });
	const flags = await setReportStatus(params.id, body.data.status);
	if (!flags) error(404, { message: 'Not found' });
	return json(flags);
};
