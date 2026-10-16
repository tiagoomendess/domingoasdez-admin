import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';
import { integer, required, requiredId, requiredUrl } from '#lib/server/validation.ts';

/**
 * The `variables` table: legacy key/values read by code on the legacy site (the old
 * "settings" page was an unfinished stub that never saved anything).
 *
 * - `secret`: never sent to the browser unless an admin asks to see it.
 * - `game`: a game id, picked from the games.
 * - `image`: a link to an image (social media posts scheduled by the legacy job).
 * - `counter`: counted by the site; editable to reset it.
 * - `text`: anything else.
 */
export type VariableKind = 'secret' | 'game' | 'image' | 'counter' | 'text';

/** Prefix of the images `ScheduleSocialMedia` posts (it reads every `social_media.*`). */
export const SOCIAL_MEDIA_PREFIX = 'social_media.';

const KNOWN: Record<string, VariableKind> = {
	// `AuthenticateAccessToken`: bearer token of the API (cached by the legacy site for 2 min).
	api_access_token: 'secret',
	// `Api\GamesController`: the game the API returns as its test game.
	test_game_id: 'game',
	// `NewSitePromptController`: answers to the "try the new site" prompt.
	new_site_prompt_yes: 'counter',
	new_site_prompt_no: 'counter',
	new_site_prompt_never: 'counter'
};

/** The `ScheduleSocialMedia` constants: the job fails without them. */
const SOCIAL_MEDIA = [
	'story_today_has_game',
	'story_directions_img',
	'story_live_matches_now',
	'story_match_mvp',
	'story_flash_interview',
	'story_game_history',
	'story_live_results',
	'story_no_fake_results',
	'story_send_videos',
	'post_today_has_game',
	'post_collaborate',
	'post_live_results'
].map((name) => SOCIAL_MEDIA_PREFIX + name);

const USED_BY_CODE = new Set([...Object.keys(KNOWN), ...SOCIAL_MEDIA]);

export function variableKind(name: string): VariableKind {
	if (KNOWN[name]) return KNOWN[name];
	if (name.startsWith(SOCIAL_MEDIA_PREFIX)) return 'image';
	return 'text';
}

/** Read by the legacy code: can't be renamed (there is no rename) or deleted. */
export const isUsedByCode = (name: string) => USED_BY_CODE.has(name);

/** Names the code reads that have no row yet. */
export const missingVariables = (existing: string[]) => {
	const have = new Set(existing);
	return [...USED_BY_CODE].filter((name) => !have.has(name));
};

export const VARIABLE_NAME = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/;

const valueSchemas = {
	secret: required(z.string().min(16).max(255)),
	game: requiredId(),
	image: requiredUrl(2048),
	counter: required(integer(0, 4_294_967_295)),
	text: required(z.string().max(65_535))
};

/** The value field of a variable's form, validated for its kind. */
export const valueFormSchema = (kind: VariableKind) =>
	z.object({ value: valueSchemas[kind] as z.ZodType<string | number> });

/** A new variable: lowercase name (`.` groups, like `social_media.*`), then its value. */
export const variableNameSchema = z.object({
	name: required(
		z
			.string()
			.max(64)
			.regex(VARIABLE_NAME, { error: () => m.settings_name_format() })
			// `/settings/new` is the create page.
			.refine((name) => name !== 'new', { error: () => m.settings_name_taken() })
	)
});
