/** Dashboard periods (days back from today, in the admin's timezone), shared with the UI. */
export const DASHBOARD_PERIODS = [7, 14, 30] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = 14;

export function parseDashboardPeriod(value: string | null | undefined): DashboardPeriod | null {
	const days = Number(value);
	return DASHBOARD_PERIODS.find((period) => period === days) ?? null;
}

/** One value per day of the period (`days[i]`), oldest first. */
export interface DailySeries {
	key: string;
	values: number[];
}

/** A per-day metric: its series, the period total and the previous period's total. */
export interface DailyMetric {
	series: DailySeries[];
	total: number;
	/**
	 * Same span just before the period, up to the same time of day, so a period that ends
	 * mid-day compares with an equally long one.
	 */
	previousTotal: number;
}
