import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { clubTeams, clubUsage, emblemUrl, findClub } from '#lib/server/clubs/index.ts';
import { saveClub } from '#lib/server/clubs/save.ts';
import { db } from '#lib/server/db/index.ts';
import { isRowReferencedError } from '#lib/server/db/errors.ts';
import { clubs } from '#lib/server/db/schema.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findUserOption } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadClub(id: number) {
	const club = await findClub(id);
	if (!club) error(404, { message: 'Not found' });
	return club;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('clubs');
	const club = await loadClub(params.id);
	const [teams, usage, adminUser] = await Promise.all([
		clubTeams(club.id),
		can(user.permissions, 'clubs.create') ? clubUsage(club.id) : null,
		findUserOption(club.adminUserId)
	]);
	return { club, emblem: emblemUrl(club.emblem), teams, usage, adminUser };
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('clubs.edit');
		const club = await loadClub(params.id);
		const result = await saveClub(await request.formData(), club, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.clubs_saved({ name: result.club.name }) });
		redirect(303, resolve('/(app)/clubs/[id=id]', { id: club.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('clubs.create');
		const club = await loadClub(params.id);
		try {
			await db.delete(clubs).where(eq(clubs.id, club.id));
		} catch (cause) {
			if (isRowReferencedError(cause)) return fail(409, { message: m.form_delete_in_use() });
			throw cause;
		}
		await audit({ action: 'delete', model: 'Club', oldValues: club });

		setFlash(cookies, { type: 'success', message: m.clubs_deleted({ name: club.name }) });
		redirect(303, resolve('/(app)/clubs'));
	}
};
