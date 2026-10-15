import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { findClubOption } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import { isRowReferencedError } from '#lib/server/db/errors.ts';
import { teams } from '#lib/server/db/schema.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findTeam, teamUsage } from '#lib/server/teams/index.ts';
import { saveTeam } from '#lib/server/teams/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadTeam(id: number) {
	const team = await findTeam(id);
	if (!team) error(404, { message: 'Not found' });
	return team;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('teams');
	const team = await loadTeam(params.id);
	const [club, usage] = await Promise.all([
		findClubOption(team.clubId),
		can(user.permissions, 'teams.create') ? teamUsage(team.id) : null
	]);
	return { team, club, usage };
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('teams.edit');
		const team = await loadTeam(params.id);
		const result = await saveTeam(await request.formData(), team);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.teams_saved({ name: result.team.name }) });
		redirect(303, resolve('/(app)/teams/[id=id]', { id: team.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('teams.create');
		const team = await loadTeam(params.id);
		try {
			await db.delete(teams).where(eq(teams.id, team.id));
		} catch (cause) {
			if (isRowReferencedError(cause)) return fail(409, { message: m.form_delete_in_use() });
			throw cause;
		}
		await audit({ action: 'delete', model: 'Team', oldValues: team });

		setFlash(cookies, { type: 'success', message: m.teams_deleted({ name: team.name }) });
		redirect(303, resolve('/(app)/teams'));
	}
};
