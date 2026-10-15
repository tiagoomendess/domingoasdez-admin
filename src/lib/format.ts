/**
 * Dates come from the database as UTC instants (`Date`) and are shown in the admin's timezone
 * (the `timezone` cookie set by the root layout, Europe/Lisbon by default).
 */

export const DEFAULT_TIMEZONE = 'Europe/Lisbon';

export function isTimeZone(value: string | null | undefined): value is string {
	if (!value || value.length > 64) return false;
	try {
		new Intl.DateTimeFormat('en', { timeZone: value });
		return true;
	} catch {
		return false;
	}
}

export function formatDateTime(
	value: Date | string | null | undefined,
	options: { timeZone: string; locale: string }
): string {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat(options.locale, {
		dateStyle: 'short',
		timeStyle: 'short',
		timeZone: options.timeZone
	}).format(date);
}

/** Calendar dates (`YYYY-MM-DD`, e.g. a founding date) have no timezone. */
export function formatDate(value: string | null | undefined, locale: string): string {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value ?? '';
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
		new Date(`${value}T00:00:00Z`)
	);
}
