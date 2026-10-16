import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { PUBLIC_FRONTEND_URL } from '$app/env/public';
import { can } from '#lib/auth/permissions.ts';
import { toLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { findGroupOption } from '#lib/server/game-groups/index.ts';
import {
	findGame,
	gameRefereeRows,
	gameSummary,
	gameUsage,
	publicGamePath
} from '#lib/server/games/index.ts';
import { deleteGame, saveGame } from '#lib/server/games/save.ts';
import { gameGoals } from '#lib/server/goals/index.ts';
import { findPlaygroundOption } from '#lib/server/playgrounds/index.ts';
import { findRefereeOptions, refereeTypeRows } from '#lib/server/referees/index.ts';
import { findTeamOption } from '#lib/server/teams/index.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadGame(id: number) {
	const game = await findGame(id);
	if (!game) error(404, { message: 'Not found' });
	return game;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	const user = requirePermission('games');
	const game = await loadGame(params.id);
	const referees = await gameRefereeRows(game.id);
	const [summary, home, away, group, playground, refereeOptions, refereeTypes, usage, goals] =
		await Promise.all([
			gameSummary(game.id),
			findTeamOption(game.homeTeamId),
			findTeamOption(game.awayTeamId),
			findGroupOption(game.gameGroupId),
			findPlaygroundOption(game.playgroundId),
			findRefereeOptions(referees.map((row) => row.refereeId)),
			refereeTypeRows(),
			can(user.permissions, 'games.create') ? gameUsage(game.id) : null,
			can(user.permissions, 'goals') ? gameGoals(game.id) : null
		]);

	return {
		game: {
			id: game.id,
			round: game.round,
			date: toLocalInput(game.date, adminTimeZone(cookies)),
			goalsHome: game.goalsHome,
			goalsAway: game.goalsAway,
			penaltiesHome: game.penaltiesHome,
			penaltiesAway: game.penaltiesAway,
			finished: game.finished,
			postponed: game.postponed,
			visible: game.visible,
			scoreboardUpdates: game.scoreboardUpdates,
			generateImage: game.generateImage,
			updatedAt: game.updatedAt
		},
		summary,
		home,
		away,
		group,
		playground,
		referees: referees.map((row) => ({
			referee: refereeOptions.get(row.refereeId) ?? null,
			typeId: row.typeId
		})),
		refereeTypes,
		usage,
		goals,
		publicUrl: summary && game.visible ? `${PUBLIC_FRONTEND_URL}${publicGamePath(summary)}` : null
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		requirePermission('games.edit');
		const game = await loadGame(params.id);
		const result = await saveGame(await request.formData(), game, adminTimeZone(cookies));
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.games_saved({ id: game.id }) });
		redirect(303, resolve('/(app)/games/[id=id]', { id: game.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('games.create');
		const game = await loadGame(params.id);
		await deleteGame(game);

		setFlash(cookies, { type: 'success', message: m.games_deleted({ id: game.id }) });
		redirect(303, resolve('/(app)/games'));
	}
};
