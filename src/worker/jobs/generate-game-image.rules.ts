import { DEFAULT_EMBLEM, placeholder } from '../images/sources.ts';

/** Games drawn per run (legacy `limit(10)`). */
export const GAMES_PER_RUN = 10;

export type CoverSources = {
	gameId: number;
	playgroundId: number | null;
	playgroundPicture: string | null;
	homeEmblem: string | null;
	awayEmblem: string | null;
	seasonName: string | null;
	seasonPicture: string | null;
	competitionName: string;
	competitionPicture: string | null;
};

/**
 * Which images and texts legacy `GenerateGameImage` drew for a game:
 * - background: the playground's picture; a playground without one gets the 1:1 placeholder of
 *   its id (legacy swapped `16_9_placeholder_` for `1_1_placeholder_` in `getPicture()`); a game
 *   without a playground gets the 16:9 placeholder of the game's id;
 * - emblems: the club's, or the default emblem;
 * - competition: `Season::getDisplayName()` / `getDisplayPicture()` (season, else competition).
 */
export function coverSources(game: CoverSources) {
	let background: string;
	if (game.playgroundId === null) background = placeholder('16_9', game.gameId);
	else background = game.playgroundPicture || placeholder('1_1', game.playgroundId);

	return {
		background,
		homeEmblem: game.homeEmblem || DEFAULT_EMBLEM,
		awayEmblem: game.awayEmblem || DEFAULT_EMBLEM,
		competition: game.seasonName || game.competitionName,
		competitionLogo: game.seasonPicture || game.competitionPicture || null
	};
}
