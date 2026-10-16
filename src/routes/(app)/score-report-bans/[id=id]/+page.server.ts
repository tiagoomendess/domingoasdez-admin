import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { toLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { isActive } from '#lib/server/score-report-bans/form.ts';
import { banReports, findBan } from '#lib/server/score-report-bans/index.ts';
import { deleteBan, liftBan, updateBan } from '#lib/server/score-report-bans/save.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import { findUserOption } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadBan(id: number) {
	const ban = await findBan(id);
	if (!ban) error(404, { message: 'Not found' });
	return ban;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	requirePermission('score-report-bans');
	const ban = await loadBan(params.id);
	const [bannedUser, reports] = await Promise.all([findUserOption(ban.userId), banReports(ban)]);
	return {
		ban: {
			...ban,
			shadowBan: Boolean(ban.shadowBan),
			ipBan: Boolean(ban.ipBan),
			expiresAtInput: ban.expiresAt ? toLocalInput(ban.expiresAt, adminTimeZone(cookies)) : '',
			active: isActive(ban.expiresAt)
		},
		bannedUser,
		reports
	};
};

const back = (id: number) => resolve('/(app)/score-report-bans/[id=id]', { id });

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('score-report-bans.edit');
		const ban = await loadBan(params.id);
		const result = await updateBan(await request.formData(), ban, adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.score_bans_saved({ id: ban.id }) });
		redirect(303, back(ban.id));
	},

	lift: async ({ params, cookies }) => {
		requirePermission('score-report-bans.edit');
		const ban = await loadBan(params.id);
		await liftBan(ban);

		setFlash(cookies, { type: 'success', message: m.score_bans_lifted({ id: ban.id }) });
		redirect(303, back(ban.id));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('score-report-bans.create');
		const ban = await loadBan(params.id);
		await deleteBan(ban);

		setFlash(cookies, { type: 'success', message: m.score_bans_deleted({ id: ban.id }) });
		redirect(303, resolve('/(app)/score-report-bans'));
	}
};
