import { z } from 'zod';
import { infoReportStatuses } from '#lib/server/db/schema.ts';

export type InfoReportStatus = (typeof infoReportStatuses)[number];

/**
 * Statuses an admin can set (legacy `InfoReportController@update` validated all five, but the
 * form never offered `deleted`: that one is set by the author on the public site).
 */
export const ADMIN_STATUSES = ['sent', 'seen', 'used', 'archived'] as const;

export const statusFormSchema = z.object({ status: z.enum(ADMIN_STATUSES) });

/** Waiting for an admin: the default list, like the legacy one. */
export const OPEN_STATUSES = ['sent', 'seen'] as const satisfies InfoReportStatus[];

/** Report codes are 9 characters (`A-Z0-9`), typed in any case. */
export function parseCode(q: string): string | null {
	const code = q.trim().replace(/^#/, '').toUpperCase();
	return /^[A-Z0-9]{9}$/.test(code) ? code : null;
}

/** `source` is free text; link it only when it is a web address. */
export function sourceUrl(source: string): string | null {
	const text = source.trim();
	if (!/^https?:\/\/\S+$/i.test(text)) return null;
	try {
		return new URL(text).href;
	} catch {
		return null;
	}
}
