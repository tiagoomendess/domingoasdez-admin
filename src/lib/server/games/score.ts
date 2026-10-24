import { count, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { goals } from '#lib/server/db/schema.ts';

export type ScoredGame = {
	id: number;
	homeTeamId: number;
	awayTeamId: number;
	goalsHome: number | null;
	goalsAway: number | null;
};

/** Goals per `gameId:teamId`, from `goalCounts()`. */
export type GoalCounts = ReadonlyMap<string, number>;

const countKey = (gameId: number, teamId: number) => `${gameId}:${teamId}`;

/**
 * Legacy `Game::getHomeScore()` / `getAwayScore()`: the typed score (`goals_home` /
 * `goals_away`), or the team's `goals` rows when it's empty.
 */
export function gameScore(game: ScoredGame, counts: GoalCounts): { home: number; away: number } {
	return {
		home: game.goalsHome ?? counts.get(countKey(game.id, game.homeTeamId)) ?? 0,
		away: game.goalsAway ?? counts.get(countKey(game.id, game.awayTeamId)) ?? 0
	};
}

/** The goal counts `gameScore()` needs: one query, only for games without a typed score. */
export async function goalCounts(games: ScoredGame[]): Promise<GoalCounts> {
	const ids = [
		...new Set(
			games.filter((game) => game.goalsHome === null || game.goalsAway === null).map((g) => g.id)
		)
	];
	if (!ids.length) return new Map();
	const rows = await db
		.select({ gameId: goals.gameId, teamId: goals.teamId, total: count() })
		.from(goals)
		.where(inArray(goals.gameId, ids))
		.groupBy(goals.gameId, goals.teamId);
	return new Map(rows.map((row) => [countKey(row.gameId, row.teamId), row.total]));
}
