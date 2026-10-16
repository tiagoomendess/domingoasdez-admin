import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { findCompetitionOption } from '#lib/server/competitions/index.ts';
import { setFlash } from '#lib/server/flash.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { findSeason, seasonGroups, seasonUsage } from '#lib/server/seasons/index.ts';
import { deleteSeason, saveSeason } from '#lib/server/seasons/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadSeason(id: number) {
	const season = await findSeason(id);
	if (!season) error(404, { message: 'Not found' });
	return season;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('seasons');
	const season = await loadSeason(params.id);
	const [competition, groups, usage] = await Promise.all([
		findCompetitionOption(season.competitionId),
		seasonGroups(season.id),
		can(user.permissions, 'seasons.create') ? seasonUsage(season.id) : null
	]);
	return { season, competition, picture: mediaUrl(season.picture), groups, usage };
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('seasons.edit');
		const season = await loadSeason(params.id);
		const result = await saveSeason(await request.formData(), season, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.seasons_saved() });
		redirect(303, resolve('/(app)/seasons/[id=id]', { id: season.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('seasons.create');
		const season = await loadSeason(params.id);
		const result = await deleteSeason(season);
		if ('message' in result) return fail(409, { message: result.message });

		setFlash(cookies, { type: 'success', message: m.seasons_deleted() });
		redirect(303, resolve('/(app)/seasons'));
	}
};
