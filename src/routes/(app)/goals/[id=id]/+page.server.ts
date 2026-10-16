import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findGameOption } from '#lib/server/games/index.ts';
import { findGoal, goalSummary } from '#lib/server/goals/index.ts';
import { deleteGoal, saveGoal } from '#lib/server/goals/save.ts';
import { findPlayerOption } from '#lib/server/players/index.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadGoal(id: number) {
	const goal = await findGoal(id);
	if (!goal) error(404, { message: 'Not found' });
	return goal;
}

export const load: PageServerLoad = async ({ params }) => {
	requirePermission('goals');
	const goal = await loadGoal(params.id);
	const [summary, game, player] = await Promise.all([
		goalSummary(goal.id),
		findGameOption(goal.gameId),
		findPlayerOption(goal.playerId)
	]);
	if (!summary) error(404, { message: 'Not found' });
	return { goal, summary, game, player };
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('goals.edit');
		const goal = await loadGoal(params.id);
		const result = await saveGoal(await request.formData(), goal);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.goals_saved() });
		redirect(303, resolve('/(app)/goals/[id=id]', { id: goal.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('goals.create');
		const goal = await loadGoal(params.id);
		await deleteGoal(goal);

		setFlash(cookies, { type: 'success', message: m.goals_deleted() });
		redirect(303, resolve('/(app)/goals'));
	}
};
