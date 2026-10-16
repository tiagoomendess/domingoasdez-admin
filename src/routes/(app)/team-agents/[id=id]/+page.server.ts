import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { findPlayerOption } from '#lib/server/players/index.ts';
import { agentHistory, findAgent } from '#lib/server/team-agents/index.ts';
import {
	deleteAgent,
	deleteHistoryEntry,
	saveAgent,
	saveHistoryEntry
} from '#lib/server/team-agents/save.ts';
import { findTeamOption } from '#lib/server/teams/index.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadAgent(id: number) {
	const agent = await findAgent(id);
	if (!agent) error(404, { message: 'Not found' });
	return agent;
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('team_agents');
	const agent = await loadAgent(params.id);
	const [team, player, history] = await Promise.all([
		findTeamOption(agent.teamId),
		findPlayerOption(agent.playerId),
		agentHistory(agent.id)
	]);
	return {
		agent: {
			id: agent.id,
			name: agent.name,
			agentType: agent.agentType,
			// Free text in the legacy schema: only a calendar date fills the date input.
			birthDate: /^\d{4}-\d{2}-\d{2}/.test(agent.birthDate ?? '')
				? agent.birthDate!.slice(0, 10)
				: '',
			externalId: agent.externalId,
			email: agent.email,
			phone: agent.phone,
			createdAt: agent.createdAt,
			updatedAt: agent.updatedAt
		},
		picture: mediaUrl(agent.picture),
		team,
		player,
		history,
		// History entries are edited with `team_agents.edit`, like the legacy history controller.
		canEditHistory: can(user.permissions, 'team_agents.edit')
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('team_agents.edit');
		const agent = await loadAgent(params.id);
		const result = await saveAgent(await request.formData(), agent, user);
		if ('failure' in result) return result.failure;

		setFlash(cookies, {
			type: 'success',
			message: m.team_agents_saved({ name: result.agent.name })
		});
		redirect(303, resolve('/(app)/team-agents/[id=id]', { id: agent.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('team_agents.create');
		const agent = await loadAgent(params.id);
		await deleteAgent(agent);

		setFlash(cookies, { type: 'success', message: m.team_agents_deleted({ name: agent.name }) });
		redirect(303, resolve('/(app)/team-agents'));
	},

	saveHistory: async ({ params, request }) => {
		requirePermission('team_agents.edit');
		const agent = await loadAgent(params.id);
		const result = await saveHistoryEntry(await request.formData(), agent);
		if ('failure' in result) return fail(400, result.failure);
		return { historySaved: true };
	},

	/** `?/deleteHistory&entry=<id>` (posted by the row's delete confirmation). */
	deleteHistory: async ({ params, url }) => {
		requirePermission('team_agents.edit');
		const agent = await loadAgent(params.id);
		const entryId = Number(url.searchParams.get('entry'));
		if (!Number.isInteger(entryId) || entryId < 1) error(400, { message: 'Bad request' });
		const result = await deleteHistoryEntry(agent, entryId);
		if ('message' in result) return fail(409, { message: result.message });
		return { historyDeleted: true };
	}
};
