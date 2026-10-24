import { and, asc, eq, inArray, like, lt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '#lib/server/db/index.ts';
import {
	articles,
	clubs,
	competitions,
	gameComments,
	gameGroups,
	games,
	media,
	playgrounds,
	seasons,
	teams
} from '#lib/server/db/schema.ts';
import { gameScore, goalCounts } from '#lib/server/games/score.ts';
import { containsPattern } from '#lib/server/list.ts';
import { storedHtml } from '#lib/server/rich-text.ts';
import type { JobContext } from '../job.ts';
import { siteDay } from '../time.ts';
import {
	buildArticle,
	groupGames,
	type CommentGame,
	type PendingComment
} from './process-game-comments.rules.ts';

/** Legacy authored the drafts as user 2. */
const AUTHOR_ID = 2;
const DESCRIPTION = 'Esta descrição tem de ser alterada antes de publicar o artigo.';

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

async function commentGames(ids: number[]): Promise<Map<number, CommentGame>> {
	const rows = await db
		.select({
			id: games.id,
			gameGroupId: games.gameGroupId,
			date: games.date,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			penaltiesHome: games.penaltiesHome,
			penaltiesAway: games.penaltiesAway,
			homeClub: homeClubs.name,
			awayClub: awayClubs.name,
			venue: playgrounds.name,
			groupName: gameGroups.name,
			competitionName: competitions.name
		})
		.from(games)
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.innerJoin(gameGroups, eq(gameGroups.id, games.gameGroupId))
		.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId))
		.leftJoin(playgrounds, eq(playgrounds.id, games.playgroundId))
		.where(inArray(games.id, ids));
	const counts = await goalCounts(rows);
	return new Map(rows.map((row) => [row.id, { ...row, score: gameScore(row, counts) }]));
}

/** Legacy `selectRandomMediaId`: any media item tagged with the club's name. */
async function randomCover(clubName: string): Promise<number | null> {
	const [row] = await db
		.select({ id: media.id })
		.from(media)
		.where(like(media.tags, containsPattern(clubName)))
		.orderBy(sql`rand()`)
		.limit(1);
	return row?.id ?? null;
}

/**
 * Legacy `ProcessGameComments`: flash interviews past their deadline become one hidden draft
 * article per game group (reviewed and published by hand), and are marked used.
 */
export async function run({ log, signal }: JobContext) {
	const pending: PendingComment[] = await db
		.select({
			id: gameComments.id,
			gameId: gameComments.gameId,
			teamId: gameComments.teamId,
			content: gameComments.content
		})
		.from(gameComments)
		.where(and(eq(gameComments.used, false), lt(gameComments.deadline, new Date())))
		.orderBy(asc(gameComments.id));
	if (!pending.length) return;

	const byId = await commentGames([...new Set(pending.map((comment) => comment.gameId))]);
	for (const group of groupGames(pending, byId)) {
		if (signal.aborted) return;
		const article = buildArticle(group, pending, Math.random);
		const mediaId = await randomCover(article.coverTag);
		const id = await db.transaction(async (tx) => {
			const [{ id }] = await tx
				.insert(articles)
				.values({
					title: article.title,
					mediaId,
					description: DESCRIPTION,
					text: storedHtml(article.text),
					userId: AUTHOR_ID,
					// The calendar day as midnight UTC, like every article date.
					date: new Date(`${siteDay(new Date())}T00:00:00Z`),
					tags: article.tags,
					visible: false
				})
				.$returningId();
			await tx
				.update(gameComments)
				.set({ used: true })
				.where(inArray(gameComments.id, article.commentIds));
			return id;
		});
		log.info(
			`draft article #${id} "${article.title}": ${group.length} game(s), ${article.commentIds.length} comment(s)`
		);
	}
}
