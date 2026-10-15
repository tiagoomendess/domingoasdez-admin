import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';
import { audit as auditTable } from '#lib/server/db/schema.ts';
import { buildAuditEntry, type AuditInput } from './audit-entry';

export type { AuditAction, AuditInput, AuditModel } from './audit-entry';

function clientAddress(event: ReturnType<typeof getRequestEvent>) {
	try {
		return event.getClientAddress();
	} catch {
		return null;
	}
}

/**
 * Writes a row to the shared `audit` table (also shown by the legacy backoffice). Call it after
 * every create / update / delete with the before/after row objects. Must run inside a request
 * (load, action, endpoint or hook). Never throws: auditing must not break the operation it logs.
 */
export async function audit(input: AuditInput & { userId?: number | null }): Promise<void> {
	try {
		const event = getRequestEvent();
		const entry = buildAuditEntry(input, {
			userId: input.userId !== undefined ? input.userId : (event.locals.user?.id ?? null),
			ipAddress: clientAddress(event),
			ipCountry: event.request.headers.get('cf-ipcountry'),
			userAgent: event.request.headers.get('user-agent'),
			timezone: event.cookies.get('timezone') ?? null,
			language: event.request.headers.get('accept-language')?.split(',')[0] ?? null
		});
		if (entry) await db.insert(auditTable).values(entry);
	} catch (error) {
		console.error('[audit] failed to write entry:', error);
	}
}
