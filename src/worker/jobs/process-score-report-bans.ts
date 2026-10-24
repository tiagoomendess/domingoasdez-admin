import { and, asc, eq, gt, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db, type Transaction } from '#lib/server/db/index.ts';
import {
	clubs,
	games,
	scoreReportBans,
	scoreReports,
	teams,
	users,
	uuidKarmas
} from '#lib/server/db/schema.ts';
import { gameScore, goalCounts } from '#lib/server/games/score.ts';
import { FAKE_REPORT_BAN_DAYS, DAY_MS } from '#lib/server/score-report-bans/form.ts';
import { findMatchingBan, lastKnownUserId } from '#lib/server/score-report-bans/index.ts';
import type { JobContext } from '../job.ts';
import { sendMail } from '../mail/index.ts';
import { buildScoreReportBanEmail } from '../mail/messages.ts';
import {
	banKey,
	banReason,
	banTarget,
	isFakeReport,
	karmaUuid,
	nextKarma,
	WINDOW_MS
} from './process-score-report-bans.rules.ts';

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

function recentWebsiteReports(now: Date) {
	return db
		.select({
			id: scoreReports.id,
			homeScore: scoreReports.homeScore,
			awayScore: scoreReports.awayScore,
			isFake: scoreReports.isFake,
			uuid: scoreReports.uuid,
			userId: scoreReports.userId,
			ipAddress: scoreReports.ipAddress,
			userAgent: scoreReports.userAgent,
			game: {
				id: games.id,
				homeTeamId: games.homeTeamId,
				awayTeamId: games.awayTeamId,
				goalsHome: games.goalsHome,
				goalsAway: games.goalsAway,
				finished: games.finished,
				postponed: games.postponed,
				homeClub: homeClubs.name,
				awayClub: awayClubs.name
			}
		})
		.from(scoreReports)
		.innerJoin(games, eq(games.id, scoreReports.gameId))
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.where(
			and(
				eq(scoreReports.source, 'website'),
				gt(scoreReports.updatedAt, new Date(now.getTime() - WINDOW_MS)),
				lt(scoreReports.updatedAt, now)
			)
		)
		.orderBy(asc(scoreReports.id));
}

/** Legacy `handleKarma`, inside the ban's transaction. */
async function punishDevice(tx: Transaction, uuid: string) {
	const [current] = await tx
		.select({ karma: uuidKarmas.karma })
		.from(uuidKarmas)
		.where(eq(uuidKarmas.uuid, uuid))
		.limit(1);
	const karma = nextKarma(current?.karma ?? null);
	if (current) await tx.update(uuidKarmas).set({ karma }).where(eq(uuidKarmas.uuid, uuid));
	else await tx.insert(uuidKarmas).values({ uuid, karma });
}

/**
 * Legacy `ProcessScoreReportBans`: website reports of the last day on finished games that were
 * flagged fake, or are above the final score, ban their sender for 15 days, lower the device's
 * karma and email the signed-in user. Fix (decided 2026-10-23): a sender already covered by an
 * active ban (e.g. banned from `/today` that afternoon) is skipped, so they don't get a second
 * ban, email and karma hit.
 */
export async function run({ log, signal, dryRun }: JobContext) {
	const now = new Date();
	const reports = await recentWebsiteReports(now);
	if (!reports.length) return;

	const counts = await goalCounts(reports.map((report) => report.game));
	const expiresAt = new Date(now.getTime() + FAKE_REPORT_BAN_DAYS * DAY_MS);
	const banned = new Set<string>();
	let fakes = 0;
	let bans = 0;

	for (const report of reports) {
		if (signal.aborted) break;
		if (!report.game.finished || report.game.postponed) continue;

		// Signed out: the last user seen on that device.
		const userId = report.userId ?? (await lastKnownUserId(report.uuid));
		const key = banKey({ userId, ipAddress: report.ipAddress, uuid: report.uuid });
		if (banned.has(key)) continue;

		const score = gameScore(report.game, counts);
		if (!isFakeReport({ ...report, isFake: Boolean(report.isFake), gameScore: score })) continue;
		fakes++;

		const matchName = `${report.game.homeClub} vs ${report.game.awayClub}`;
		const target = banTarget({ ...report, userId });
		const existing = await findMatchingBan(target);
		if (existing) {
			log.info(`report ${report.id} (${matchName}): sender already banned (ban #${existing.id})`);
			banned.add(key);
			continue;
		}

		const reason = banReason(matchName);
		try {
			const id = await db.transaction(async (tx) => {
				const [{ id }] = await tx
					.insert(scoreReportBans)
					.values({ ...target, reason, expiresAt })
					.$returningId();
				const uuid = karmaUuid(report.uuid);
				if (uuid) await punishDevice(tx, uuid);
				return id;
			});
			banned.add(key);
			bans++;
			log.info(`report ${report.id} (${matchName}): ban #${id} until ${expiresAt.toISOString()}`);
		} catch (error) {
			log.error(`report ${report.id}: could not create the ban`, error);
			continue;
		}

		if (!userId) continue;
		const [user] = await db
			.select({ name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		// A deleted account has no email (legacy's notification silently sent nothing).
		if (!user?.email) continue;
		try {
			await sendMail(
				buildScoreReportBanEmail({ to: user.email, name: user.name, expiresAt, reason }),
				{ dryRun, log }
			);
		} catch (error) {
			log.error(`report ${report.id}: could not email user ${userId}`, error);
		}
	}

	log.info(`${reports.length} report(s) checked, ${fakes} fake, ${bans} ban(s) created`);
}
