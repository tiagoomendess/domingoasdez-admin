import { and, asc, eq, gt, gte, inArray, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { SCORE_REPORT_CONSUMER_SHADOW } from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { clubs, games, playgrounds, scoreReports, teams } from '#lib/server/db/schema.ts';
import { gameScore, goalCounts } from '#lib/server/games/score.ts';
import type { JobContext } from '../job.ts';
import {
	decideScore,
	isLive,
	REPORT_WINDOW_MS,
	scoreKey,
	tallyScores,
	utcDay,
	type ConsumerReport
} from './score-report-consumer.rules.ts';

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

async function liveGames(now: Date) {
	const { start, end } = utcDay(now);
	const rows = await db
		.select({
			id: games.id,
			date: games.date,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			finished: games.finished,
			playground: playgrounds.location,
			homeClub: homeClubs.name,
			awayClub: awayClubs.name
		})
		.from(games)
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.leftJoin(playgrounds, eq(playgrounds.id, games.playgroundId))
		.where(
			and(
				gt(games.date, start),
				lt(games.date, end),
				eq(games.visible, true),
				eq(games.postponed, false)
			)
		);
	return rows.filter((game) => isLive(game.date, now) && !game.finished);
}

async function recentReports(gameIds: number[], now: Date) {
	const rows = await db
		.select({
			id: scoreReports.id,
			gameId: scoreReports.gameId,
			homeScore: scoreReports.homeScore,
			awayScore: scoreReports.awayScore,
			finished: scoreReports.finished,
			source: scoreReports.source,
			userId: scoreReports.userId,
			location: scoreReports.location,
			accuracy: scoreReports.locationAccuracy
		})
		.from(scoreReports)
		.where(
			and(
				inArray(scoreReports.gameId, gameIds),
				gte(scoreReports.createdAt, new Date(now.getTime() - REPORT_WINDOW_MS)),
				eq(scoreReports.isFake, false)
			)
		)
		.orderBy(asc(scoreReports.createdAt), asc(scoreReports.id));

	const byGame = new Map<number, ConsumerReport[]>();
	for (const { gameId, ...row } of rows) {
		const report = { ...row, finished: Boolean(row.finished) };
		byGame.set(gameId, [...(byGame.get(gameId) ?? []), report]);
	}
	return byGame;
}

/**
 * Legacy `ScoreReportConsumer`: every minute, the live games' score is set from the reports of
 * the last 7 minutes when they agree enough (rules in `score-report-consumer.rules.ts`). With
 * SCORE_REPORT_CONSUMER_SHADOW the decisions are only logged.
 *
 * Legacy also cleared the legacy site's `live_matches` file cache after an update; the worker
 * can't reach it (30 s TTL) and the public app reads the database.
 */
export async function run({ log, signal }: JobContext) {
	const now = new Date();
	const live = await liveGames(now);
	if (!live.length) return;

	const [reports, counts] = await Promise.all([
		recentReports(
			live.map((game) => game.id),
			now
		),
		goalCounts(live)
	]);

	let updated = 0;
	for (const game of live) {
		if (signal.aborted) break;
		const name = `#${game.id} ${game.homeClub} vs ${game.awayClub}`;
		try {
			const gameReports = reports.get(game.id) ?? [];
			if (!gameReports.length) continue;

			const decision = decideScore(tallyScores(gameReports, game.playground));
			log.debug(`${name}: ${gameReports.length} report(s), ${decision.summary}`);
			if (!decision.tally) continue;

			const score = gameScore(game, counts);
			const current = scoreKey(score.home, score.away, Boolean(game.finished));
			const next = decision.tally;
			if (current === next.key) continue;

			if (SCORE_REPORT_CONSUMER_SHADOW) {
				log.info(`would update ${name} from ${current} to ${next.key} (${decision.summary})`);
				continue;
			}
			await db
				.update(games)
				.set({ goalsHome: next.home, goalsAway: next.away, finished: next.finished })
				.where(eq(games.id, game.id));
			updated++;
			log.info(`updated ${name} from ${current} to ${next.key} (${decision.summary})`);
		} catch (error) {
			// One game must not stop the others, as in legacy.
			log.error(`${name}: failed`, error);
		}
	}
	log.debug(`${updated} of ${live.length} live game(s) updated`);
}
