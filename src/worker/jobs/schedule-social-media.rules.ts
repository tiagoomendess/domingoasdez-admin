import { slugify } from '#lib/slug.ts';
import { fromLocalInput } from '#lib/datetime.ts';
import type { PlannedPost } from '../social/posts.ts';
import { siteDay, SITE_TIME_ZONE } from '../time.ts';

/** `variables` rows read by the job (legacy `ScheduleSocialMedia` constants). */
export const VARIABLE_PREFIX = 'social_media.';
export const IMAGES = {
	storyTodayHasGame: 'social_media.story_today_has_game',
	storyDirections: 'social_media.story_directions_img',
	storyLiveMatchesNow: 'social_media.story_live_matches_now',
	storyMatchMvp: 'social_media.story_match_mvp',
	storyFlashInterview: 'social_media.story_flash_interview',
	storyGameHistory: 'social_media.story_game_history',
	storyLiveResults: 'social_media.story_live_results',
	storyNoFakeResults: 'social_media.story_no_fake_results',
	storySendVideos: 'social_media.story_send_videos',
	postTodayHasGame: 'social_media.post_today_has_game',
	postCollaborate: 'social_media.post_collaborate',
	postLiveResults: 'social_media.post_live_results'
} as const;

/** More games than this: 5 random ones are promoted, plus a "more games on the site" story. */
export const MATCHES_TO_PROMOTE = 5;

export type { PlannedPost };
type Platform = PlannedPost['platform'];
const BOTH: Platform[] = ['facebook', 'instagram'];
const MINUTE = 60_000;

/** A slot whose image the job draws: a game's story, or the "more games" story. */
export type ImageSlot =
	| { kind: 'promotion'; gameId: number; publishAt: Date }
	| { kind: 'more-matches'; remaining: number; publishAt: Date };

/** The day's timeline, in the legacy creation order (posts at the same time publish by id). */
export type TimelineEntry = { kind: 'posts'; posts: PlannedPost[] } | ImageSlot;

export type TodayMatch = {
	id: number;
	date: Date;
	seasonId: number;
	seasonName: string | null;
	competitionName: string;
	/** Hidden competitions get no standings post. */
	competitionVisible: boolean;
	startYear: number;
	endYear: number;
};

/** Lisbon's day around `now`, as UTC instants (legacy `startOfDay()` / `endOfDay()`). */
export function siteDayRange(now: Date): { start: Date; end: Date } {
	const day = siteDay(now);
	const start = fromLocalInput(`${day}T00:00`, SITE_TIME_ZONE)!;
	const end = new Date(fromLocalInput(`${day}T23:59`, SITE_TIME_ZONE)!.getTime() + 59_000);
	return { start, end };
}

/** Legacy `Season::getPublicUrl()`: `/competicoes/<season>/<name>` on the public site. */
export function seasonUrl(siteUrl: string, match: TodayMatch): string {
	const season =
		match.startYear === match.endYear
			? String(match.startYear)
			: `${match.startYear}-${String(match.endYear).slice(-2)}`;
	return `${siteUrl.replace(/\/+$/, '')}/competicoes/${season}/${slugify(match.seasonName || match.competitionName)}`;
}

/** Fisher–Yates with an injected random source (tests), then the first `amount`. */
function pickRandom<T>(items: T[], amount: number, random: () => number): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy.slice(0, amount);
}

/**
 * Legacy `ScheduleSocialMedia::handle()`: the social media posts of a match day (Lisbon time),
 * from the day's visible games of competitions with social media on, ordered by kick-off.
 *
 * - 07:00: "today there are games" story and post on Facebook and Instagram;
 * - from 07:01: one story per game, 10 minutes apart; with more than 5 games, 5 random ones a
 *   minute apart and then a story with the number of other games;
 * - around the first kick-off (K): directions K−1h, history K−45m, "live now" K, a Facebook
 *   text post with the live page K, live results story and post K+10m, "send videos" K+15m,
 *   "collaborate" post K+45m, "no fake results" K+1h, MVP vote K+2h, flash interview K+2h15m;
 * - K+3h: one Facebook text post per season of a visible competition ("Classificação da …
 *   atualizada").
 *
 * `images` maps the `social_media.*` variables to their image URLs; a missing one leaves its
 * posts out (legacy crashed on it).
 */
export function dayTimeline(input: {
	matches: TodayMatch[];
	images: ReadonlyMap<string, string>;
	now: Date;
	siteUrl: string;
	random: () => number;
}): TimelineEntry[] {
	const { matches, images, now } = input;
	if (!matches.length) return [];
	const site = input.siteUrl.replace(/\/+$/, '');
	const games = `${site}/jogos`;

	const entries: TimelineEntry[] = [];
	const add = (posts: PlannedPost[]) => {
		if (posts.length) entries.push({ kind: 'posts', posts });
	};
	const image = (
		platform: Platform,
		postType: 'post' | 'story',
		variable: string,
		publishAt: Date,
		textContent: string | null = null
	): PlannedPost[] => {
		const mediaPath = images.get(variable);
		if (!mediaPath) return [];
		return [{ platform, postType, postContentType: 'image', mediaPath, textContent, publishAt }];
	};
	const text = (textContent: string, publishAt: Date): PlannedPost => ({
		platform: 'facebook',
		postType: 'post',
		postContentType: 'text',
		mediaPath: null,
		textContent,
		publishAt
	});
	const stories = (variable: string, publishAt: Date) =>
		BOTH.flatMap((platform) => image(platform, 'story', variable, publishAt));

	const at7 = fromLocalInput(`${siteDay(now)}T07:00`, SITE_TIME_ZONE)!;
	add(
		BOTH.flatMap((platform) => [
			...image(platform, 'story', IMAGES.storyTodayHasGame, at7),
			...image(
				platform,
				'post',
				IMAGES.postTodayHasGame,
				at7,
				`Hoje tem futebol popular, lista de jogos em 🔗 ${games}`
			)
		])
	);

	const firstPromotion = new Date(at7.getTime() + MINUTE);
	if (matches.length <= MATCHES_TO_PROMOTE) {
		matches.forEach((match, i) =>
			entries.push({
				kind: 'promotion',
				gameId: match.id,
				publishAt: new Date(firstPromotion.getTime() + i * 10 * MINUTE)
			})
		);
	} else {
		pickRandom(matches, MATCHES_TO_PROMOTE, input.random).forEach((match, i) =>
			entries.push({
				kind: 'promotion',
				gameId: match.id,
				publishAt: new Date(firstPromotion.getTime() + i * MINUTE)
			})
		);
		entries.push({
			kind: 'more-matches',
			remaining: matches.length - MATCHES_TO_PROMOTE,
			publishAt: new Date(firstPromotion.getTime() + MATCHES_TO_PROMOTE * MINUTE)
		});
	}

	const first = matches[0].date.getTime();
	const after = (minutes: number) => new Date(first + minutes * MINUTE);
	add(stories(IMAGES.storyDirections, after(-60)));
	add(stories(IMAGES.storyGameHistory, after(-45)));
	add(stories(IMAGES.storyLiveMatchesNow, after(0)));
	add([text(`🔴 Acompanha aqui todos os resultados em direto ⤵️ ${games}`, after(0))]);
	add(
		BOTH.flatMap((platform) => [
			...image(platform, 'story', IMAGES.storyLiveResults, after(10)),
			...image(platform, 'post', IMAGES.postLiveResults, after(10), `Acompanha em 🔗 ${games}`)
		])
	);
	add(stories(IMAGES.storySendVideos, after(15)));
	add(
		BOTH.flatMap((platform) =>
			image(
				platform,
				'post',
				IMAGES.postCollaborate,
				after(45),
				'🔴📣 Colabora e envia o resultado do jogo que estás a ver pelo site'
			)
		)
	);
	add(stories(IMAGES.storyNoFakeResults, after(60)));
	add(stories(IMAGES.storyMatchMvp, after(120)));
	add(stories(IMAGES.storyFlashInterview, after(135)));

	const seasons = new Map<number, TodayMatch>();
	for (const match of matches) {
		if (match.competitionVisible && !seasons.has(match.seasonId))
			seasons.set(match.seasonId, match);
	}
	add(
		[...seasons.values()].map((match) =>
			text(
				// Legacy wrote the URL right after the arrow, without a space.
				`Classificação da ${match.seasonName || match.competitionName} atualizada ⤵️${seasonUrl(site, match)}`,
				after(180)
			)
		)
	);
	return entries;
}
