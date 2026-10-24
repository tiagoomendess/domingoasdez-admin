import { randomInt } from 'node:crypto';
import { and, asc, eq, gt, lt, notExists } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { PUBLIC_FRONTEND_URL } from '$app/env/public';
import { db } from '#lib/server/db/index.ts';
import { clubs, gameComments, games, teams, users } from '#lib/server/db/schema.ts';
import type { JobContext } from '../job.ts';
import { sendMail } from '../mail/index.ts';
import { buildGameCommentEmail } from '../mail/messages.ts';
import { siteEndOfDay } from '../time.ts';
import {
	flashInterviewUrls,
	GAMES_PER_RUN,
	generatePin,
	notificationEmail,
	WINDOW_MS
} from './generate-game-comments.rules.ts';

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');
const homeAdmins = alias(users, 'home_admins');
const awayAdmins = alias(users, 'away_admins');

/** Finished, visible games of the last 2 days without flash interviews yet. */
function gamesWithoutComments(now: Date) {
	return db
		.select({
			id: games.id,
			date: games.date,
			home: {
				teamId: games.homeTeamId,
				club: homeClubs.name,
				teamEmail: homeTeams.contactEmail,
				clubEmail: homeClubs.contactEmail,
				adminEmail: homeAdmins.email,
				notifications: homeClubs.notificationsEnabled
			},
			away: {
				teamId: games.awayTeamId,
				club: awayClubs.name,
				teamEmail: awayTeams.contactEmail,
				clubEmail: awayClubs.contactEmail,
				adminEmail: awayAdmins.email,
				notifications: awayClubs.notificationsEnabled
			}
		})
		.from(games)
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.leftJoin(homeAdmins, eq(homeAdmins.id, homeClubs.adminUserId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.leftJoin(awayAdmins, eq(awayAdmins.id, awayClubs.adminUserId))
		.where(
			and(
				eq(games.finished, true),
				eq(games.postponed, false),
				eq(games.visible, true),
				// Legacy compared Lisbon local times with the UTC column; these are UTC instants.
				gt(games.date, new Date(now.getTime() - WINDOW_MS)),
				lt(games.date, now),
				notExists(
					db
						.select({ id: gameComments.id })
						.from(gameComments)
						.where(eq(gameComments.gameId, games.id))
				)
			)
		)
		.orderBy(asc(games.id))
		.limit(GAMES_PER_RUN);
}

/**
 * Legacy `GenerateGameComments`: each finished game gets one flash interview per team (uuid,
 * PIN, answer by the end of tomorrow in Lisbon), and each club with notifications on is asked by
 * email to answer it.
 */
export async function run({ log, signal, dryRun }: JobContext) {
	const now = new Date();
	const pending = await gamesWithoutComments(now);
	if (!pending.length) return;

	const deadline = siteEndOfDay(now, 1);
	for (const game of pending) {
		if (signal.aborted) return;
		const sides = [game.home, game.away].map((side) => ({
			...side,
			uuid: crypto.randomUUID(),
			pin: generatePin(() => randomInt(10))
		}));
		// Both or none: legacy could leave a game with one comment, and never made the other.
		await db.transaction(async (tx) => {
			await tx.insert(gameComments).values(
				sides.map((side) => ({
					uuid: side.uuid,
					pin: side.pin,
					gameId: game.id,
					teamId: side.teamId,
					deadline,
					content: ''
				}))
			);
		});
		log.info(`flash interviews for #${game.id} ${game.home.club} vs ${game.away.club}`);

		for (const side of sides) {
			const to = notificationEmail({
				team: side.teamEmail,
				club: side.clubEmail,
				clubAdmin: side.adminEmail
			});
			if (!to) {
				log.debug(`#${game.id}: no notification email for team ${side.teamId}`);
				continue;
			}
			if (!side.notifications) {
				log.debug(`#${game.id}: notifications disabled for ${side.club}`);
				continue;
			}
			const urls = flashInterviewUrls(PUBLIC_FRONTEND_URL ?? '', side.uuid, side.pin);
			const mail = buildGameCommentEmail({
				to,
				clubName: side.club,
				homeClub: game.home.club,
				awayClub: game.away.club,
				gameDate: game.date,
				pin: side.pin,
				deadline,
				actionUrl: urls.action,
				unsubscribeUrl: urls.unsubscribe
			});
			try {
				await sendMail(mail, { dryRun, log });
			} catch (error) {
				// The interview stays: it can still be answered from the public site.
				log.error(`#${game.id}: could not email ${to}`, error);
			}
		}
	}
}
