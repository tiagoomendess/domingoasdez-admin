import { and, asc, count, eq, gt, gte, isNotNull, sql, type SQL } from 'drizzle-orm';
import type { MySqlColumn, MySqlTable } from 'drizzle-orm/mysql-core';
import type { DailyMetric, DashboardPeriod } from '#lib/dashboard.ts';
import { db } from '#lib/server/db/index.ts';
import {
	gameComments,
	infoReports,
	mvpVotes,
	partnerClicks,
	partners,
	playerUpdateRequests,
	scoreReportBans,
	scoreReports,
	userPermissions,
	users
} from '#lib/server/db/schema.ts';
import { clickTotals } from '#lib/server/partners/index.ts';
import { dailyMetric, dashboardRange, type DashboardRange, type HourlyCount } from './series.ts';

/** Non-admins see only the first few staff names, like the legacy dashboard card. */
const STAFF_PREVIEW = 4;

/**
 * Score report sources, bottom of the stack first. `today_edit` is the legacy `/hoje/edit`
 * page, the predecessor of `/today` (`admin`), so both count as the backoffice. Any other
 * source goes to `other`.
 */
export const SCORE_SOURCES = ['website', 'api_afpb_crawler', 'placard', 'admin', 'other'] as const;
const SCORE_SOURCE_ALIASES: Record<string, (typeof SCORE_SOURCES)[number]> = {
	today_edit: 'admin'
};

/**
 * Rows per UTC hour since the start of the comparison span. These tables have no
 * `created_at` index, but they are small (`score_reports`, the largest, has ~15k rows).
 */
function hourly(
	table: MySqlTable,
	column: MySqlColumn,
	range: DashboardRange,
	{ where, key }: { where?: SQL; key?: MySqlColumn } = {}
): Promise<HourlyCount[]> {
	const hour = sql<string>`date_format(${column}, '%Y-%m-%d %H:00:00')`;
	// Keys come back as strings whatever the column type (partner ids are numbers).
	const keyColumn = (key ? sql<string>`${key}` : sql<string>`''`).mapWith(String);
	return db
		.select({ hour, key: keyColumn, count: count() })
		.from(table)
		.where(and(gte(column, range.previousStart), where))
		.groupBy(hour, keyColumn);
}

/** Users with at least one permission (the backoffice staff). */
async function staff() {
	const rows = await db
		.selectDistinct({ id: users.id, name: users.name })
		.from(userPermissions)
		.innerJoin(users, eq(users.id, userPermissions.userId))
		.orderBy(asc(users.name), asc(users.id));
	return rows.map((row) => ({ id: row.id, name: row.name?.trim() || `#${row.id}` }));
}

/** Registered users, as the legacy dashboard counted them. */
const verifiedUser = and(eq(users.verified, true), isNotNull(users.email));

/** The current-state numbers, as scalar subqueries of one statement (one connection). */
async function counts(now: Date) {
	const [row] = await db
		.select({
			pendingUpdateRequests: db.$count(
				playerUpdateRequests,
				eq(playerUpdateRequests.status, 'pending')
			),
			// Same rule as the legacy `ScoreReportBan` active check.
			activeBans: db.$count(scoreReportBans, gt(scoreReportBans.expiresAt, now)),
			unseenInfoReports: db.$count(infoReports, eq(infoReports.status, 'sent')),
			registeredUsers: db.$count(users, verifiedUser)
		})
		.from(sql`dual`);
	return row;
}

/**
 * Ad clicks per day, and per visible partner in the period next to its all-time total (the
 * legacy card only had the all-time totals).
 */
async function partnerClickMetric(range: DashboardRange, timeZone: string) {
	const totals = clickTotals();
	const allTime = sql<number>`coalesce(${totals.total}, 0)`.mapWith(Number);
	const [rows, visible] = await Promise.all([
		hourly(partnerClicks, partnerClicks.createdAt, range, { key: partnerClicks.partnerId }),
		db
			.select({ id: partners.id, name: partners.name, allTime })
			.from(partners)
			.leftJoin(totals, eq(totals.partnerId, partners.id))
			.where(eq(partners.visible, true))
	]);

	const byPartner = dailyMetric(rows, range, timeZone, {
		keys: [...new Set(rows.map((row) => row.key ?? ''))]
	});
	const periodClicks = new Map(
		byPartner.series.map((s) => [s.key, s.values.reduce((sum, value) => sum + value, 0)])
	);
	const daily: DailyMetric = {
		series: [
			{
				key: 'total',
				values: range.days.map((_, i) => byPartner.series.reduce((sum, s) => sum + s.values[i], 0))
			}
		],
		total: byPartner.total,
		previousTotal: byPartner.previousTotal
	};

	const list = visible
		.map((partner) => ({ ...partner, clicks: periodClicks.get(String(partner.id)) ?? 0 }))
		.sort((a, b) => b.clicks - a.clicks || b.allTime - a.allTime || a.name.localeCompare(b.name));
	return { daily, partners: list };
}

/**
 * The legacy `Backoffice\DashboardController` metrics, as daily series over the chosen period
 * where the data has a date (legacy only showed totals and the last 24/48 hours). Read fresh on
 * every visit: legacy cached each one for 60 s, these queries are cheap.
 */
export async function loadDashboard({
	isAdmin,
	period,
	timeZone,
	now = new Date()
}: {
	isAdmin: boolean;
	period: DashboardPeriod;
	timeZone: string;
	now?: Date;
}) {
	const range = dashboardRange(now, period, timeZone);
	const metric = (rows: Promise<HourlyCount[]>) =>
		rows.then((r) => dailyMetric(r, range, timeZone));

	const [
		current,
		scoreReportRows,
		mvpVotesMetric,
		flashInterviewsMetric,
		newUsersMetric,
		updateRequestsMetric,
		infoReportsMetric,
		bansMetric,
		clicks,
		staffList
	] = await Promise.all([
		counts(now),
		hourly(scoreReports, scoreReports.createdAt, range, { key: scoreReports.source }),
		metric(hourly(mvpVotes, mvpVotes.createdAt, range)),
		// Flash interviews written: legacy counted the ones edited after creation.
		metric(
			hourly(gameComments, gameComments.createdAt, range, {
				where: gt(gameComments.updatedAt, gameComments.createdAt)
			})
		),
		metric(hourly(users, users.createdAt, range, { where: verifiedUser })),
		metric(hourly(playerUpdateRequests, playerUpdateRequests.createdAt, range)),
		metric(hourly(infoReports, infoReports.createdAt, range)),
		metric(hourly(scoreReportBans, scoreReportBans.createdAt, range)),
		partnerClickMetric(range, timeZone),
		staff()
	]);

	const scoreReportsMetric = dailyMetric(
		scoreReportRows.map((row) => ({
			...row,
			key: SCORE_SOURCE_ALIASES[row.key ?? ''] ?? row.key
		})),
		range,
		timeZone,
		{ keys: SCORE_SOURCES, fallback: 'other' }
	);

	return {
		period,
		days: range.days,
		...current,
		updateRequests: updateRequestsMetric,
		infoReports: infoReportsMetric,
		bans: bansMetric,
		scoreReports: scoreReportsMetric,
		mvpVotes: mvpVotesMetric,
		flashInterviews: flashInterviewsMetric,
		newUsers: newUsersMetric,
		partnerClicks: clicks.daily,
		partners: clicks.partners,
		/** Admins get every name (legacy admin-only list); others the legacy card preview. */
		staff: isAdmin ? staffList : staffList.slice(0, STAFF_PREVIEW)
	};
}

export type DashboardMetrics = Awaited<ReturnType<typeof loadDashboard>>;
