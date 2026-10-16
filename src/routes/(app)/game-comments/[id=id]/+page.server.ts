import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { PUBLIC_FRONTEND_URL } from '$app/env/public';
import { toLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { commentPath, commentSummary, findComment } from '#lib/server/game-comments/index.ts';
import { deleteComment, updateComment } from '#lib/server/game-comments/save.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadComment(id: number) {
	const comment = await findComment(id);
	if (!comment) error(404, { message: 'Not found' });
	return comment;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	requirePermission('games');
	const comment = await loadComment(params.id);
	const summary = await commentSummary(comment.id);
	if (!summary) error(404, { message: 'Not found' });
	return {
		comment: {
			id: comment.id,
			content: comment.content,
			deadline: toLocalInput(comment.deadline, adminTimeZone(cookies)),
			pin: comment.pin
		},
		summary: { ...summary, uuid: undefined, pin: undefined },
		link: `${PUBLIC_FRONTEND_URL}${commentPath(comment)}`
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('games.edit');
		const comment = await loadComment(params.id);
		const result = await updateComment(await request.formData(), comment, adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.game_comments_saved() });
		redirect(303, resolve('/(app)/game-comments/[id=id]', { id: comment.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('games.create');
		const comment = await loadComment(params.id);
		await deleteComment(comment);

		setFlash(cookies, { type: 'success', message: m.game_comments_deleted() });
		redirect(303, resolve('/(app)/game-comments'));
	}
};
