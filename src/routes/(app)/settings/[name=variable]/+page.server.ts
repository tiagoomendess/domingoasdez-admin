import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findGameOption } from '#lib/server/games/index.ts';
import { findVariable, variableView } from '#lib/server/settings/index.ts';
import { deleteVariable, revealVariable, updateVariable } from '#lib/server/settings/save.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadVariable(name: string) {
	const variable = await findVariable(name);
	if (!variable) error(404, { message: 'Not found' });
	return variable;
}

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('admin');
	const variable = variableView(await loadVariable(params.name));
	const game =
		variable.kind === 'game' && /^\d+$/.test(variable.value ?? '')
			? await findGameOption(Number(variable.value))
			: null;
	return { variable, game };
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('admin');
		const variable = await loadVariable(params.name);
		const result = await updateVariable(await request.formData(), variable);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.settings_saved({ name: variable.name }) });
		redirect(303, resolve('/(app)/settings/[name=variable]', { name: variable.name }));
	},

	/** A secret's value, on request only (logged). */
	reveal: async ({ params }) => {
		requirePermission('admin');
		const variable = await loadVariable(params.name);
		return { revealed: await revealVariable(variable) };
	},

	delete: async ({ params, cookies }) => {
		requirePermission('admin');
		const variable = await loadVariable(params.name);
		const result = await deleteVariable(variable);
		if ('message' in result) return fail(409, { message: result.message });

		setFlash(cookies, { type: 'success', message: m.settings_deleted({ name: variable.name }) });
		redirect(303, resolve('/(app)/settings'));
	}
};
