import type { Cookies } from '@sveltejs/kit';
import { DEFAULT_TIMEZONE, isTimeZone } from '#lib/format.ts';

/** The admin's timezone (cookie set by the root layout), to show and read dates. */
export function adminTimeZone(cookies: Cookies): string {
	const timezone = cookies.get('timezone');
	return isTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE;
}
