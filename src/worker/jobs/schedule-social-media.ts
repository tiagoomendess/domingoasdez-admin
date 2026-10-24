import { and, asc, eq, gte, like, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { PUBLIC_FRONTEND_URL } from '$app/env/public';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameGroups,
	games,
	playgrounds,
	seasons,
	socialMediaPosts,
	teams,
	variables
} from '#lib/server/db/schema.ts';
import { gameScore, goalCounts } from '#lib/server/games/score.ts';
import type { JobContext } from '../job.ts';
import { renderMatchStory } from '../images/match-story.ts';
import { renderMoreMatchesStory } from '../images/more-matches.ts';
import { DEFAULT_EMBLEM, loadImage, placeholder } from '../images/sources.ts';
import { fileDay, imagePosts, storeTmpImage } from '../social/posts.ts';
import {
	dayTimeline,
	siteDayRange,
	VARIABLE_PREFIX,
	type PlannedPost
} from './schedule-social-media.rules.ts';

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

/** The day's visible games of competitions with social media on, by kick-off. */
function todayMatches(now: Date) {
	const { start, end } = siteDayRange(now);
	return db
		.select({
			id: games.id,
			date: games.date,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			penaltiesHome: games.penaltiesHome,
			penaltiesAway: games.penaltiesAway,
			finished: games.finished,
			playgroundId: games.playgroundId,
			playgroundName: playgrounds.name,
			playgroundPicture: playgrounds.picture,
			homeClub: homeClubs.name,
			homeEmblem: homeClubs.emblem,
			awayClub: awayClubs.name,
			awayEmblem: awayClubs.emblem,
			seasonId: seasons.id,
			seasonName: seasons.name,
			seasonPicture: seasons.picture,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			competitionName: competitions.name,
			competitionPicture: competitions.picture,
			competitionVisible: competitions.visible
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
		.where(
			and(
				gte(games.date, start),
				lte(games.date, end),
				eq(games.visible, true),
				eq(competitions.socialMediaEnabled, true)
			)
		)
		.orderBy(asc(games.date), asc(games.id));
}

type Match = Awaited<ReturnType<typeof todayMatches>>[number];

/** Legacy `generateStoryImage()` sources: the playground's picture (or its 16:9 placeholder). */
async function matchStory(match: Match, counts: Awaited<ReturnType<typeof goalCounts>>) {
	const background =
		match.playgroundId === null
			? placeholder('16_9', match.id)
			: match.playgroundPicture || placeholder('16_9', match.playgroundId);
	const logo = match.seasonPicture || match.competitionPicture;
	const [backgroundBytes, homeEmblem, awayEmblem, competitionLogo] = await Promise.all([
		loadImage(background),
		loadImage(match.homeEmblem || DEFAULT_EMBLEM),
		loadImage(match.awayEmblem || DEFAULT_EMBLEM),
		logo ? loadImage(logo) : null
	]);
	const score = gameScore(match, counts);
	const penalties =
		score.home === score.away && match.penaltiesHome !== null && match.penaltiesAway !== null
			? { home: match.penaltiesHome, away: match.penaltiesAway }
			: null;
	return renderMatchStory({
		background: backgroundBytes,
		homeEmblem,
		awayEmblem,
		competitionLogo,
		competition: match.seasonName || match.competitionName,
		homeClub: match.homeClub,
		awayClub: match.awayClub,
		playground: match.playgroundName ?? '',
		kickOff: match.date,
		result: match.finished ? { ...score, penalties } : null
	});
}

/**
 * Legacy `ScheduleSocialMedia` (daily, 05:15 UTC): the match day's social media timeline as
 * `social_media_posts` rows, published by `publish-social-media`. The game stories are drawn
 * here and stored in /storage/tmp. All rows are inserted together at the end.
 */
export async function run({ log }: JobContext) {
	const now = new Date();
	const matches = await todayMatches(now);
	if (!matches.length) {
		log.info('no games today to promote');
		return;
	}

	const settings = await db
		.select({ name: variables.name, value: variables.value })
		.from(variables)
		.where(like(variables.name, `${VARIABLE_PREFIX}%`));
	const images = new Map(settings.map((row) => [row.name, row.value]));

	const timeline = dayTimeline({
		matches: matches.map((match) => ({
			...match,
			competitionVisible: Boolean(match.competitionVisible)
		})),
		images,
		now,
		siteUrl: PUBLIC_FRONTEND_URL ?? 'https://domingoasdez.com',
		random: Math.random
	});

	const byId = new Map(matches.map((match) => [match.id, match]));
	const counts = await goalCounts(matches);
	const posts: PlannedPost[] = [];
	let promotionsFailed = false;
	for (const entry of timeline) {
		if (entry.kind === 'posts') {
			posts.push(...entry.posts);
		} else if (entry.kind === 'promotion') {
			// Legacy stopped promoting at the first game whose story failed.
			if (promotionsFailed) continue;
			try {
				const jpeg = await matchStory(byId.get(entry.gameId)!, counts);
				const url = await storeTmpImage(`match_promotion_story_${entry.gameId}.jpg`, jpeg);
				posts.push(...imagePosts('story', url, entry.publishAt));
			} catch (error) {
				promotionsFailed = true;
				log.error(`game #${entry.gameId}: could not draw the story`, error);
			}
		} else {
			try {
				const jpeg = await renderMoreMatchesStory(entry.remaining);
				const url = await storeTmpImage(`${fileDay(now)}_more_matches_story.jpg`, jpeg);
				posts.push(...imagePosts('story', url, entry.publishAt));
			} catch (error) {
				log.error('could not draw the "more games" story', error);
			}
		}
	}

	await db.transaction(async (tx) => {
		await tx.insert(socialMediaPosts).values(posts);
	});
	log.info(`${posts.length} post(s) scheduled for ${matches.length} game(s)`);
}
