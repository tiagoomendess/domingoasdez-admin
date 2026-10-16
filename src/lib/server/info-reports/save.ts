import { eq } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db/index.ts';
import { infoReports } from '#lib/server/db/schema.ts';
import { invalid, parseForm } from '#lib/server/forms.ts';
import { statusFormSchema, type InfoReportStatus } from './form';
import type { InfoReportRow } from './index';

async function setStatus(report: InfoReportRow, status: InfoReportStatus) {
	if (report.status === status) return report;
	await db.update(infoReports).set({ status }).where(eq(infoReports.id, report.id));
	const [updated] = await db.select().from(infoReports).where(eq(infoReports.id, report.id));
	await audit({ action: 'update', model: 'InfoReport', oldValues: report, newValues: updated });
	return updated;
}

/** Legacy `InfoReportController@edit`: opening an unread report marks it as seen. */
export const markSeen = (report: InfoReportRow) =>
	report.status === 'sent' ? setStatus(report, 'seen') : Promise.resolve(report);

/** Legacy `InfoReportController@update`: the status is the only thing an admin changes. */
export async function saveInfoReportStatus(formData: FormData, report: InfoReportRow) {
	const form = parseForm(statusFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	return { report: await setStatus(report, form.data.status) };
}
