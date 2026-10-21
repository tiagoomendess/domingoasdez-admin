import { describe, expect, it } from 'vitest';
import { parseDashboardPeriod } from '#lib/dashboard.ts';
import { dailyMetric, dashboardRange, localDay } from './series.ts';

const LISBON = 'Europe/Lisbon';

describe('dashboardRange', () => {
	it('ends today in the admin timezone and starts at local midnight', () => {
		// 23:30 UTC on 20 Oct is already 21 Oct in Lisbon (summer time, UTC+1).
		const range = dashboardRange(new Date('2026-10-20T23:30:00Z'), 7, LISBON);

		expect(range.days).toEqual([
			'2026-10-15',
			'2026-10-16',
			'2026-10-17',
			'2026-10-18',
			'2026-10-19',
			'2026-10-20',
			'2026-10-21'
		]);
		expect(range.start.toISOString()).toBe('2026-10-14T23:00:00.000Z');
		expect(range.previousStart.toISOString()).toBe('2026-10-07T23:00:00.000Z');
		expect(range.previousEnd.toISOString()).toBe('2026-10-13T23:30:00.000Z');
	});

	it('crosses a DST change', () => {
		// Lisbon goes back to UTC+0 on 25 Oct 2026.
		const range = dashboardRange(new Date('2026-10-27T10:00:00Z'), 7, LISBON);
		expect(range.days.at(0)).toBe('2026-10-21');
		expect(range.start.toISOString()).toBe('2026-10-20T23:00:00.000Z');
		expect(localDay(new Date('2026-10-26T00:30:00Z'), LISBON)).toBe('2026-10-26');
	});
});

describe('dailyMetric', () => {
	const range = dashboardRange(new Date('2026-10-21T12:00:00Z'), 7, LISBON);

	it('puts hourly counts on local days and sums the comparison span', () => {
		const metric = dailyMetric(
			[
				// 23:00 UTC on 20 Oct is 00:00 on 21 Oct in Lisbon.
				{ hour: '2026-10-20 23:00:00', count: 4 },
				{ hour: '2026-10-20 22:00:00', count: 1 },
				{ hour: '2026-10-14 23:00:00', count: 2 },
				// Previous span: from 7 Oct 23:00 UTC up to 14 Oct 12:00 UTC.
				{ hour: '2026-10-08 10:00:00', count: 5 },
				{ hour: '2026-10-14 11:00:00', count: 3 },
				// Later in the day than now, a week ago: not in the comparison.
				{ hour: '2026-10-14 15:00:00', count: 7 }
			],
			range,
			LISBON
		);

		expect(metric.series).toEqual([{ key: 'total', values: [2, 0, 0, 0, 0, 1, 4] }]);
		expect(metric.total).toBe(7);
		expect(metric.previousTotal).toBe(8);
	});

	it('splits by key in a fixed order, unknown keys going to the fallback', () => {
		const metric = dailyMetric(
			[
				{ hour: '2026-10-21 10:00:00', key: 'website', count: 3 },
				{ hour: '2026-10-21 10:00:00', key: 'mystery', count: 1 },
				{ hour: '2026-10-20 10:00:00', key: 'admin', count: 2 }
			],
			range,
			LISBON,
			{ keys: ['website', 'admin', 'other'], fallback: 'other' }
		);

		expect(metric.series.map((s) => [s.key, s.values.slice(-2)])).toEqual([
			['website', [0, 3]],
			['admin', [2, 0]],
			['other', [0, 1]]
		]);
		expect(metric.total).toBe(6);
	});
});

describe('parseDashboardPeriod', () => {
	it('accepts only the offered periods', () => {
		expect(parseDashboardPeriod('7')).toBe(7);
		expect(parseDashboardPeriod('30')).toBe(30);
		expect(parseDashboardPeriod('31')).toBeNull();
		expect(parseDashboardPeriod(undefined)).toBeNull();
	});
});
