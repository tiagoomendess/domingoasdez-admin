import { and, asc, eq, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameGroups,
	games,
	playgrounds,
	seasons,
	teams
} from '#lib/server/db/schema.ts';
import { deleteFile, STORAGE_FOLDERS, storeFile } from '#lib/server/storage/index.ts';
import type { JobContext } from '../job.ts';
import { renderGameCover } from '../images/game-cover.ts';
import { loadImage } from '../images/sources.ts';
import { coverSources, GAMES_PER_RUN } from './generate-game-image.rules.ts';

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

function gamesToDraw() {
	return db
		.select({
			gameId: games.id,
			image: games.image,
			postponed: games.postponed,
			playgroundId: games.playgroundId,
			playgroundPicture: playgrounds.picture,
			homeClub: homeClubs.name,
			homeEmblem: homeClubs.emblem,
			awayClub: awayClubs.name,
			awayEmblem: awayClubs.emblem,
			seasonName: seasons.name,
			seasonPicture: seasons.picture,
			competitionName: competitions.name,
			competitionPicture: competitions.picture
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
		.where(eq(games.generateImage, true))
		.orderBy(asc(games.id))
		.limit(GAMES_PER_RUN);
}

/**
 * Legacy `GenerateGameImage`: games flagged `generate_image` (the admin sets it when the clubs,
 * playground, competition or postponement change) get a new cover (`games.image`), and the old
 * file is deleted when no other game uses it. A game that fails keeps its flag and is tried again
 * next minute, as in legacy.
 */
export async function run({ log, signal }: JobContext) {
	const pending = await gamesToDraw();
	for (const game of pending) {
		if (signal.aborted) return;
		try {
			const sources = coverSources(game);
			const [background, homeEmblem, awayEmblem, competitionLogo] = await Promise.all([
				loadImage(sources.background),
				loadImage(sources.homeEmblem),
				loadImage(sources.awayEmblem),
				sources.competitionLogo ? loadImage(sources.competitionLogo) : null
			]);
			const jpeg = await renderGameCover({
				background,
				homeEmblem,
				awayEmblem,
				competitionLogo,
				competition: sources.competition,
				homeClub: game.homeClub,
				awayClub: game.awayClub,
				postponed: Boolean(game.postponed)
			});
			const url = await storeFile(STORAGE_FOLDERS.gameImages, jpeg, 'jpg', 'image/jpeg');
			await db
				.update(games)
				.set({ image: url, generateImage: false })
				.where(eq(games.id, game.gameId));

			// Before names were unique, games with the same clubs and season shared one file.
			if (game.image) {
				const [shared] = await db
					.select({ id: games.id })
					.from(games)
					.where(and(eq(games.image, game.image), ne(games.id, game.gameId)))
					.limit(1);
				if (!shared) await deleteFile(game.image);
			}
			log.info(`cover for #${game.gameId} ${game.homeClub} vs ${game.awayClub}: ${url}`);
		} catch (error) {
			log.error(`#${game.gameId}: could not draw the cover`, error);
		}
	}
}
