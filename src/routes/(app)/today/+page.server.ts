import { error } from '@sveltejs/kit';
import { canEditAnyScore, canUseToday } from '#lib/auth/access.ts';
import { requireUser } from '#lib/server/auth/guard.ts';
import { dayRange, localDay, shiftDay } from '#lib/server/today/form.ts';
import { dayGames } from '#lib/server/today/index.ts';
import { saveScore } from '#lib/server/today/save.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

/** `score_update` (legacy permission) or a club admin; per-game rights are checked on save. */
function requireToday() {
	const user = requireUser();
	if (!canUseToday(user)) error(403, { message: 'Forbidden' });
	return user;
}

export const load: PageServerLoad = async ({ url, cookies }) => {
	const user = requireToday();
	const timeZone = adminTimeZone(cookies);
	const today = localDay(new Date(), timeZone);
	// Other days only for `score_update`: club admins edit today's results.
	const browse = canEditAnyScore(user);
	const requested = url.searchParams.get('day');
	const range = browse && requested ? dayRange(requested, timeZone) : null;
	const day = range ? requested! : today;

	return {
		day,
		today,
		browse,
		previous: shiftDay(day, -1),
		next: shiftDay(day, 1),
		sections: await dayGames(user, range ?? dayRange(today, timeZone)!)
	};
};

export const actions: Actions = {
	score: async ({ request }) => {
		const user = requireToday();
		const result = await saveScore(await request.formData(), user);
		if ('failure' in result) return result.failure;
		return { saved: result.game.id };
	}
};
