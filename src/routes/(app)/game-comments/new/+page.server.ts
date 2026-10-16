import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { toLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { createComment } from '#lib/server/game-comments/save.ts';
import { findGameOption } from '#lib/server/games/index.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

/** `?game=<id>` preselects the game. The deadline starts like the legacy job's: end of tomorrow. */
export const load: PageServerLoad = async ({ url, cookies }) => {
	requirePermission('games.create');
	const gameId = Number(url.searchParams.get('game'));
	const timeZone = adminTimeZone(cookies);
	const tomorrow = toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000), timeZone);
	return {
		game: Number.isInteger(gameId) && gameId > 0 ? await findGameOption(gameId) : null,
		deadline: `${tomorrow.slice(0, 10)}T23:59`
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('games.create');
		const result = await createComment(await request.formData(), adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.game_comments_created() });
		redirect(303, resolve('/(app)/game-comments/[id=id]', { id: result.comment.id }));
	}
};
