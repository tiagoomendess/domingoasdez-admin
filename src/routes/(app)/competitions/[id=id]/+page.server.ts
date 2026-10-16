import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import {
	competitionSeasons,
	competitionUsage,
	findCompetition
} from '#lib/server/competitions/index.ts';
import { deleteCompetition, saveCompetition } from '#lib/server/competitions/save.ts';
import { setFlash } from '#lib/server/flash.ts';
import { mediaUrl } from '#lib/server/media.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadCompetition(id: number) {
	const competition = await findCompetition(id);
	if (!competition) error(404, { message: 'Not found' });
	return competition;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('competitions');
	const competition = await loadCompetition(params.id);
	const [seasons, usage] = await Promise.all([
		competitionSeasons(competition.id),
		can(user.permissions, 'competitions.create') ? competitionUsage(competition.id) : null
	]);
	return { competition, picture: mediaUrl(competition.picture), seasons, usage };
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('competitions.edit');
		const competition = await loadCompetition(params.id);
		const result = await saveCompetition(await request.formData(), competition, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.competitions_saved({ name: result.competition.name })
		});
		redirect(303, resolve('/(app)/competitions/[id=id]', { id: competition.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('competitions.create');
		const competition = await loadCompetition(params.id);
		const result = await deleteCompetition(competition);
		if ('message' in result) return fail(409, { message: result.message });

		setFlash(cookies, {
			type: 'success',
			message: m.competitions_deleted({ name: competition.name })
		});
		redirect(303, resolve('/(app)/competitions'));
	}
};
