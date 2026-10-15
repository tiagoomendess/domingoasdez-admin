import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { toLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { createPoll } from '#lib/server/polls/save.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

const DAY = 24 * 60 * 60 * 1000;

export const load: PageServerLoad = ({ cookies }) => {
	requirePermission('polls.create');
	// Legacy defaults: published and showing results now, voting closes in 3 days.
	const timeZone = adminTimeZone(cookies);
	const now = new Date();
	return {
		defaults: {
			question: '',
			publishAfter: toLocalInput(now, timeZone),
			closeAfter: toLocalInput(new Date(now.getTime() + 3 * DAY), timeZone),
			showResultsAfter: toLocalInput(now, timeZone)
		}
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('polls.create');
		const result = await createPoll(await request.formData(), adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.polls_created({ id: result.poll.id }) });
		redirect(303, resolve('/(app)/polls/[id=id]', { id: result.poll.id }));
	}
};
