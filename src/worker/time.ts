import { fromLocalInput, toLocalInput } from '#lib/datetime.ts';

/** The site's timezone: legacy jobs build days, deadlines and texts in Lisbon time. */
export const SITE_TIME_ZONE = 'Europe/Lisbon';

/** `YYYY-MM-DD` of `date` in Lisbon. */
export const siteDay = (date: Date) => toLocalInput(date, SITE_TIME_ZONE).slice(0, 10);

/** Today (Lisbon) at `HH:mm` Lisbon time, as a UTC instant (legacy `now('Europe/Lisbon')->setTime()`). */
export const siteTimeToday = (now: Date, time: string) =>
	fromLocalInput(`${siteDay(now)}T${time}`, SITE_TIME_ZONE)!;

/** `DD/MM/YYYY` and `HH:mm` of `date` in Lisbon, as the legacy emails write them. */
export function siteDateTime(date: Date): { date: string; time: string } {
	const [day, time] = toLocalInput(date, SITE_TIME_ZONE).split('T');
	const [year, month, dayOfMonth] = day.split('-');
	return { date: `${dayOfMonth}/${month}/${year}`, time };
}

/** The last second of the Lisbon day `days` after `date`'s (Carbon `endOfDay()`), as a UTC instant. */
export function siteEndOfDay(date: Date, days = 0): Date {
	const [year, month, day] = siteDay(date).split('-').map(Number);
	const target = new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
	const lastMinute = fromLocalInput(`${target}T23:59`, SITE_TIME_ZONE)!;
	return new Date(lastMinute.getTime() + 59_000);
}

const part = (options: Intl.DateTimeFormatOptions) => {
	const format = new Intl.DateTimeFormat('pt-PT', { timeZone: SITE_TIME_ZONE, ...options });
	return (date: Date) => format.format(date);
};

/**
 * Portuguese date words in Lisbon time, as Carbon's `translatedFormat` gave them: `05`,
 * `domingo`, `outubro` (lower case, the same words in pt_BR and pt-PT).
 */
export const sitePortugueseDate = {
	day: part({ day: '2-digit' }),
	weekday: part({ weekday: 'long' }),
	month: part({ month: 'long' })
};
