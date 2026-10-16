import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { createBan } from '#lib/server/score-report-bans/save.ts';
import { findUserOption } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

/** `?uuid=&ip=&user=&user_agent=` prefill the form (e.g. from a score report on a ban page). */
export const load: PageServerLoad = async ({ url }) => {
	requirePermission('score-report-bans.create');
	const param = (name: string, max: number) => url.searchParams.get(name)?.slice(0, max) ?? '';
	const userId = Number(url.searchParams.get('user'));
	return {
		prefill: {
			uuid: param('uuid', 40),
			ipAddress: param('ip', 45),
			userAgent: param('user_agent', 255)
		},
		bannedUser: Number.isSafeInteger(userId) && userId > 0 ? await findUserOption(userId) : null
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		requirePermission('score-report-bans.create');
		const result = await createBan(await request.formData());
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.score_bans_created({ id: result.ban.id }) });
		redirect(303, resolve('/(app)/score-report-bans/[id=id]', { id: result.ban.id }));
	}
};
