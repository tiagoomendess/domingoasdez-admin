import type { DailyMetric } from '#lib/dashboard.ts';
import { fromLocalInput } from '#lib/datetime.ts';

const DAY = 24 * 60 * 60 * 1000;

const dayFormats = new Map<string, Intl.DateTimeFormat>();

/** Calendar day (`YYYY-MM-DD`) of `date` in `timeZone`. */
export function localDay(date: Date, timeZone: string): string {
	let format = dayFormats.get(timeZone);
	if (!format) {
		// en-CA formats dates as YYYY-MM-DD.
		format = new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short' });
		dayFormats.set(timeZone, format);
	}
	return format.format(date);
}

function addDays(day: string, amount: number): string {
	const date = new Date(`${day}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + amount);
	return date.toISOString().slice(0, 10);
}

export interface DashboardRange {
	/** The period's calendar days in the admin's timezone, oldest first, ending today. */
	days: string[];
	/** Midnight of the first day. */
	start: Date;
	/** The comparison span: `[previousStart, previousEnd)`, the same length right before. */
	previousStart: Date;
	previousEnd: Date;
}

export function dashboardRange(now: Date, length: number, timeZone: string): DashboardRange {
	const today = localDay(now, timeZone);
	const days = Array.from({ length }, (_, i) => addDays(today, i - length + 1));
	const midnight = (day: string) => fromLocalInput(`${day}T00:00`, timeZone) ?? new Date(day);
	return {
		days,
		start: midnight(days[0]),
		previousStart: midnight(addDays(days[0], -length)),
		previousEnd: new Date(now.getTime() - length * DAY)
	};
}

/** Count of rows in one UTC hour (`YYYY-MM-DD HH:00:00`), optionally per series key. */
export interface HourlyCount {
	hour: string;
	count: number;
	key?: string;
}

/**
 * Spreads hourly counts over the period's local days. The database groups by UTC hour (MySQL
 * has no timezone tables in every environment), which maps exactly onto local days for
 * timezones with whole-hour offsets such as Europe/Lisbon.
 *
 * `keys` fixes the series and their order; rows with another key go to `fallback` (or are
 * dropped without one). Without `keys` everything is one series, `total`.
 */
export function dailyMetric(
	rows: HourlyCount[],
	range: DashboardRange,
	timeZone: string,
	{ keys = ['total'], fallback }: { keys?: readonly string[]; fallback?: string } = {}
): DailyMetric {
	const dayIndex = new Map(range.days.map((day, i) => [day, i]));
	const series = keys.map((key) => ({ key, values: range.days.map(() => 0) }));
	const byKey = new Map(series.map((s) => [s.key, s]));
	let total = 0;
	let previousTotal = 0;

	for (const row of rows) {
		const target =
			keys.length === 1 ? series[0] : (byKey.get(row.key ?? '') ?? byKey.get(fallback ?? ''));
		if (!target) continue;
		const instant = new Date(`${row.hour.replace(' ', 'T')}Z`);
		if (instant < range.start) {
			if (instant >= range.previousStart && instant < range.previousEnd) previousTotal += row.count;
			continue;
		}
		const i = dayIndex.get(localDay(instant, timeZone));
		if (i === undefined) continue;
		target.values[i] += row.count;
		total += row.count;
	}

	return { series, total, previousTotal };
}
