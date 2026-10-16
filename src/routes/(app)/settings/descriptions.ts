import { m } from '#lib/paraglide/messages.js';

const descriptions: Record<string, () => string> = {
	api_access_token: m.settings_desc_api_access_token,
	test_game_id: m.settings_desc_test_game_id,
	new_site_prompt_yes: m.settings_desc_new_site_prompt_yes,
	new_site_prompt_no: m.settings_desc_new_site_prompt_no,
	new_site_prompt_never: m.settings_desc_new_site_prompt_never
};

/** What a variable is for, when the legacy code reads it. */
export function describeVariable(name: string): string | null {
	if (descriptions[name]) return descriptions[name]();
	const social = /^social_media\.(story|post)_(.+)$/.exec(name);
	if (social) {
		const topic = social[2].replaceAll('_', ' ');
		return social[1] === 'story'
			? m.settings_desc_social_story({ topic })
			: m.settings_desc_social_post({ topic });
	}
	return null;
}
