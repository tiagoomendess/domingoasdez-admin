import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { toLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { pollStatus } from '#lib/server/polls/form.ts';
import { findPoll, pollImage, pollResults } from '#lib/server/polls/index.ts';
import { deletePoll, isPublished, updatePoll } from '#lib/server/polls/save.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadPoll(id: number) {
	const poll = await findPoll(id);
	if (!poll) error(404, { message: 'Not found' });
	return poll;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	requirePermission('polls');
	const poll = await loadPoll(params.id);
	const timeZone = adminTimeZone(cookies);
	return {
		poll: {
			id: poll.id,
			question: poll.question,
			slug: poll.slug,
			publishAfter: toLocalInput(poll.publishAfter, timeZone),
			publishedAt: poll.publishAfter,
			closeAfter: toLocalInput(poll.closeAfter, timeZone),
			showResultsAfter: toLocalInput(poll.showResultsAfter, timeZone),
			visible: poll.visible,
			updateImage: poll.updateImage,
			updatedAt: poll.updatedAt
		},
		status: pollStatus(poll),
		publishLocked: isPublished(poll),
		image: pollImage(poll.image),
		answers: await pollResults(poll.id)
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('polls.edit');
		const poll = await loadPoll(params.id);
		const result = await updatePoll(await request.formData(), poll, adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.polls_saved({ id: poll.id }) });
		redirect(303, resolve('/(app)/polls/[id=id]', { id: poll.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('polls.create');
		const poll = await loadPoll(params.id);
		await deletePoll(poll);

		setFlash(cookies, { type: 'success', message: m.polls_deleted({ id: poll.id }) });
		redirect(303, resolve('/(app)/polls'));
	}
};
