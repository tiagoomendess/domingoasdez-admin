import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { tieBreakerOf } from '#lib/server/group-rules/form.ts';
import { findRules, rulesGroupCount, rulesPositions } from '#lib/server/group-rules/index.ts';
import { deleteRules, saveRules } from '#lib/server/group-rules/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadRules(id: number) {
	const rules = await findRules(id);
	if (!rules) error(404, { message: 'Not found' });
	return rules;
}

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('group_rules');
	const rules = await loadRules(params.id);
	const [positions, groups] = await Promise.all([
		rulesPositions(rules.id),
		rulesGroupCount(rules.id)
	]);
	return {
		rules: { ...rules, tieBreaker: tieBreakerOf(rules.tieBreakerScript) },
		positions: positions.map(({ positions, color, label }) => ({ positions, color, label })),
		groups
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('group_rules.edit');
		const rules = await loadRules(params.id);
		const result = await saveRules(await request.formData(), rules);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.group_rules_saved({ name: result.rules.name })
		});
		redirect(303, resolve('/(app)/group-rules/[id=id]', { id: rules.id }));
	},

	// New: legacy had no delete. `.create`, like the other sections' deletes.
	delete: async ({ params, cookies }) => {
		requirePermission('group_rules.create');
		const rules = await loadRules(params.id);
		const result = await deleteRules(rules);
		if ('message' in result) return fail(409, { message: result.message });

		setFlash(cookies, { type: 'success', message: m.group_rules_deleted({ name: rules.name }) });
		redirect(303, resolve('/(app)/group-rules'));
	}
};
