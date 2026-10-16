import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { saveAgent } from '#lib/server/team-agents/save.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	requirePermission('team_agents.create');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const user = requirePermission('team_agents.create');
		const result = await saveAgent(await request.formData(), null, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.team_agents_created({ name: result.agent.name })
		});
		redirect(303, resolve('/(app)/team-agents/[id=id]', { id: result.agent.id }));
	}
};
