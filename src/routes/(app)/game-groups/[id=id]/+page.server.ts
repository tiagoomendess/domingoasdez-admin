import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findGroup, groupGameCount } from '#lib/server/game-groups/index.ts';
import { deleteGroup, saveGroup } from '#lib/server/game-groups/save.ts';
import { findRulesOption } from '#lib/server/group-rules/index.ts';
import { findSeasonOption } from '#lib/server/seasons/index.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadGroup(id: number) {
	const group = await findGroup(id);
	if (!group) error(404, { message: 'Not found' });
	return group;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('game_groups');
	const group = await loadGroup(params.id);
	const [season, rules, games] = await Promise.all([
		findSeasonOption(group.seasonId),
		findRulesOption(group.groupRulesId),
		groupGameCount(group.id)
	]);
	return {
		group,
		season,
		rules,
		games,
		canSeeSeason: can(user.permissions, 'seasons'),
		canSeeRules: can(user.permissions, 'group_rules')
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('game_groups.edit');
		const group = await loadGroup(params.id);
		const result = await saveGroup(await request.formData(), group);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.game_groups_saved({ name: result.group.name ?? '' })
		});
		redirect(303, resolve('/(app)/game-groups/[id=id]', { id: group.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('game_groups.create');
		const group = await loadGroup(params.id);
		const result = await deleteGroup(group);
		if ('message' in result) return fail(409, { message: result.message });

		setFlash(cookies, {
			type: 'success',
			message: m.game_groups_deleted({ name: group.name ?? '' })
		});
		redirect(303, resolve('/(app)/game-groups'));
	}
};
