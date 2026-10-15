import { and, asc, desc, eq, gt, gte, isNotNull, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	gameComments,
	infoReports,
	mvpVotes,
	partners,
	playerUpdateRequests,
	scoreReportBans,
	scoreReports,
	userPermissions,
	users
} from '#lib/server/db/schema.ts';
import { clickTotals } from '#lib/server/partners/index.ts';

const HOUR = 60 * 60 * 1000;

/** Non-admins see only the first few staff names, like the legacy dashboard card. */
const STAFF_PREVIEW = 4;

/** Visible partners with their all-time ad clicks, most clicked first (legacy did N+1). */
async function partnerClickCounts() {
	const totals = clickTotals();
	const clicks = sql<number>`coalesce(${totals.total}, 0)`.mapWith(Number);
	return db
		.select({ id: partners.id, name: partners.name, clicks })
		.from(partners)
		.leftJoin(totals, eq(totals.partnerId, partners.id))
		.where(eq(partners.visible, true))
		.orderBy(desc(clicks), asc(partners.name));
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

/** The single-number metrics, as scalar subqueries of one statement (one connection). */
async function counts(now: number) {
	const since24h = new Date(now - 24 * HOUR);
	const since48h = new Date(now - 48 * HOUR);
	const [row] = await db
		.select({
			pendingUpdateRequests: db.$count(
				playerUpdateRequests,
				eq(playerUpdateRequests.status, 'pending')
			),
			// Same rule as the legacy `ScoreReportBan` active check.
			activeBans: db.$count(scoreReportBans, gt(scoreReportBans.expiresAt, new Date(now))),
			unseenInfoReports: db.$count(infoReports, eq(infoReports.status, 'sent')),
			mvpVotes24h: db.$count(mvpVotes, gte(mvpVotes.createdAt, since24h)),
			scoreReports24h: db.$count(scoreReports, gte(scoreReports.createdAt, since24h)),
			// Flash interviews written (edited after creation) in the last 48 h.
			editedFlashInterviews48h: db.$count(
				gameComments,
				and(
					gt(gameComments.createdAt, since48h),
					gt(gameComments.updatedAt, gameComments.createdAt)
				)
			),
			registeredUsers: db.$count(users, and(eq(users.verified, true), isNotNull(users.email)))
		})
		.from(sql`dual`);
	return row;
}

/**
 * The legacy `Backoffice\DashboardController` metrics. Legacy cached each one for 60 s; these
 * are cheap queries on small tables, so they are read fresh (e.g. right after an approval).
 */
export async function loadDashboard({ isAdmin }: { isAdmin: boolean }) {
	const [metrics, partnerClicksList, staffList] = await Promise.all([
		counts(Date.now()),
		partnerClickCounts(),
		staff()
	]);

	return {
		...metrics,
		partnerClicks: partnerClicksList,
		/** Admins get every name (legacy admin-only list); others the legacy card preview. */
		staff: isAdmin ? staffList : staffList.slice(0, STAFF_PREVIEW)
	};
}

export type DashboardMetrics = Awaited<ReturnType<typeof loadDashboard>>;
