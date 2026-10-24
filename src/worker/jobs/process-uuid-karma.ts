import { and, eq, gt, or, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { games, scoreReports, uuidKarmas } from '#lib/server/db/schema.ts';
import { gameScore, goalCounts } from '#lib/server/games/score.ts';
import type { JobContext } from '../job.ts';
import { karmaDeltas } from './process-uuid-karma.rules.ts';

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Legacy `ProcessUuidKarma`: karma for the devices that sent reports in the last 24 hours. */
export async function run({ log }: JobContext) {
	const since = new Date(Date.now() - WINDOW_MS);
	const rows = await db
		.select({
			uuid: scoreReports.uuid,
			homeScore: scoreReports.homeScore,
			awayScore: scoreReports.awayScore,
			finished: scoreReports.finished,
			isCorrect: scoreReports.isCorrect,
			isFake: scoreReports.isFake,
			game: {
				id: games.id,
				homeTeamId: games.homeTeamId,
				awayTeamId: games.awayTeamId,
				goalsHome: games.goalsHome,
				goalsAway: games.goalsAway
			}
		})
		.from(scoreReports)
		.innerJoin(games, eq(games.id, scoreReports.gameId))
		.where(
			and(
				gt(scoreReports.createdAt, since),
				// Only the reports one of the passes can count.
				or(
					eq(scoreReports.finished, true),
					eq(scoreReports.isCorrect, true),
					eq(scoreReports.isFake, true)
				)
			)
		);

	const counts = await goalCounts(rows.map((row) => row.game));
	const deltas = karmaDeltas(
		rows.map((row) => ({
			uuid: row.uuid,
			homeScore: row.homeScore,
			awayScore: row.awayScore,
			finished: Boolean(row.finished),
			isCorrect: Boolean(row.isCorrect),
			isFake: Boolean(row.isFake),
			gameScore: gameScore(row.game, counts)
		}))
	);

	// All or nothing: a half-applied night would be counted again by nobody (the window moves on).
	await db.transaction(async (tx) => {
		for (const [uuid, delta] of deltas) {
			await tx
				.insert(uuidKarmas)
				.values({ uuid, karma: delta })
				.onDuplicateKeyUpdate({
					set: { karma: sql`${uuidKarmas.karma} + ${delta}`, updatedAt: new Date() }
				});
		}
	});

	log.info(`${rows.length} report(s), karma changed for ${deltas.size} device(s)`);
}
