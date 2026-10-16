import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { profilePictureUrl } from '#lib/server/media.ts';
import { canGrant } from '#lib/server/users/form.ts';
import {
	allPermissions,
	findProfile,
	findUser,
	socialLogins,
	userBanHistory,
	userPermissionRows
} from '#lib/server/users/index.ts';
import {
	banUser,
	grantPermission,
	pardonUser,
	revokePermission,
	updateProfile
} from '#lib/server/users/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadUser(id: number) {
	const user = await findUser(id);
	if (!user) error(404, { message: 'Not found' });
	return user;
}

const back = (id: number) => resolve('/(app)/users/[id=id]', { id });

export const load: PageServerLoad = async ({ params }) => {
	const actor = requirePermission('users');
	const user = await loadUser(params.id);
	const [profile, providers, granted, all, bans] = await Promise.all([
		findProfile(user.id),
		socialLogins(user.id),
		userPermissionRows(user.id),
		allPermissions(),
		userBanHistory(user.id)
	]);
	const grantedIds = new Set(granted.map((row) => row.id));
	const canEdit = can(actor.permissions, 'users.edit');

	return {
		account: {
			id: user.id,
			name: user.name,
			email: user.email,
			verified: user.verified,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			providers,
			// Accounts created with Google/Facebook may have no password.
			hasPassword: Boolean(user.password)
		},
		profile: {
			picture: profile?.picture ?? '',
			pictureUrl: profilePictureUrl(profile?.picture),
			phone: profile?.phone ?? null,
			bio: profile?.bio ?? null,
			timezone: profile?.timezone ?? null
		},
		permissions: granted.map((row) => ({
			...row,
			removable:
				canEdit &&
				canGrant(actor.permissions, row.name) &&
				!(user.id === actor.id && ['admin', 'dashboard'].includes(row.name))
		})),
		grantable: canEdit
			? all.filter((row) => !grantedIds.has(row.id) && canGrant(actor.permissions, row.name))
			: [],
		bans,
		banned: bans.some((ban) => !ban.pardoned),
		isSelf: user.id === actor.id,
		canEdit
	};
};

export const actions: Actions = {
	profile: async ({ params, request, cookies }) => {
		requirePermission('users.edit');
		const user = await loadUser(params.id);
		const result = await updateProfile(await request.formData(), user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.users_profile_saved() });
		redirect(303, back(user.id));
	},

	grant: async ({ params, request, cookies }) => {
		const actor = requirePermission('users.edit');
		const user = await loadUser(params.id);
		const result = await grantPermission(await request.formData(), user, actor);
		if ('message' in result) return fail(400, { permissionError: result.message });

		if (result.permission) {
			setFlash(cookies, {
				type: 'success',
				message: m.users_permission_granted({ permission: result.permission })
			});
		}
		redirect(303, back(user.id));
	},

	revoke: async ({ params, request, cookies }) => {
		const actor = requirePermission('users.edit');
		const user = await loadUser(params.id);
		const result = await revokePermission(await request.formData(), user, actor);
		if ('message' in result) return fail(400, { permissionError: result.message });

		if (result.permission) {
			setFlash(cookies, {
				type: 'success',
				message: m.users_permission_revoked({ permission: result.permission })
			});
		}
		redirect(303, back(user.id));
	},

	ban: async ({ params, request, cookies }) => {
		const actor = requirePermission('users.edit');
		const user = await loadUser(params.id);
		const result = await banUser(await request.formData(), user, actor);
		if ('message' in result) return fail(400, { banError: result.message });

		setFlash(cookies, { type: 'success', message: m.users_banned({ name: user.name ?? '' }) });
		redirect(303, back(user.id));
	},

	pardon: async ({ params, cookies }) => {
		requirePermission('users.edit');
		const user = await loadUser(params.id);
		await pardonUser(user);

		setFlash(cookies, { type: 'success', message: m.users_pardoned({ name: user.name ?? '' }) });
		redirect(303, back(user.id));
	}
};
