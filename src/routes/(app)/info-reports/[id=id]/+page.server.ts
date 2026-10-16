import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { ADMIN_STATUSES, sourceUrl } from '#lib/server/info-reports/form.ts';
import {
	findInfoReport,
	nextOpenReportId,
	openReportCount,
	reportAuthor
} from '#lib/server/info-reports/index.ts';
import { markSeen, saveInfoReportStatus } from '#lib/server/info-reports/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadReport(id: number) {
	const report = await findInfoReport(id);
	if (!report) error(404, { message: 'Not found' });
	return report;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('info_reports');
	const canEdit = can(user.permissions, 'info_reports.edit');
	// Legacy marked it seen on opening the edit form, which needed `.edit`: viewers don't.
	const report = canEdit
		? await markSeen(await loadReport(params.id))
		: await loadReport(params.id);
	const [author, openTotal, nextId] = await Promise.all([
		reportAuthor(report.userId),
		openReportCount(),
		nextOpenReportId(report.id)
	]);

	return {
		report: {
			id: report.id,
			code: report.code,
			status: report.status,
			content: report.content,
			source: report.source,
			sourceUrl: sourceUrl(report.source),
			createdAt: report.createdAt,
			updatedAt: report.updatedAt
		},
		author,
		openTotal,
		nextId,
		statuses: ADMIN_STATUSES,
		canEdit,
		canSeeUsers: can(user.permissions, 'users')
	};
};

export const actions: Actions = {
	/** Set the status, then go to the next open report (or back to the list). */
	status: async ({ params, request, cookies }) => {
		requirePermission('info_reports.edit');
		const report = await loadReport(params.id);
		const result = await saveInfoReportStatus(await request.formData(), report);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.info_reports_saved({ code: report.code }) });
		const nextId = await nextOpenReportId(report.id);
		redirect(
			303,
			nextId
				? resolve('/(app)/info-reports/[id=id]', { id: nextId })
				: resolve('/(app)/info-reports')
		);
	}
};
