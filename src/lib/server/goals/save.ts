import { eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { goals } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { findGame } from '#lib/server/games/index.ts';
import { goalFormSchema, isOwnGoal } from './form';
import { playerTeamId, type Goal } from './index';

/**
 * Create (`existing` null) or update a goal (legacy `GoalController@store/update`). Fixed legacy
 * bugs: the credited team could be a team outside the game; the automatic own goal compared with
 * the player's current team whatever it was (see `isOwnGoal`); and edits and deletes were not
 * audited.
 */
export async function saveGoal(formData: FormData, existing: Goal | null) {
	const form = parseForm(goalFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	const game = await findGame(data.game_id);
	if (!game) errors.game_id = [m.validation_not_found()];
	let playerTeam: number | null = null;
	if (data.player_id) {
		const team = await playerTeamId(data.player_id);
		if (team === undefined) errors.player_id = [m.validation_not_found()];
		else playerTeam = team;
	}
	if (Object.keys(errors).length || !game) return { failure: invalid(errors, values) };

	const [teamId, opposingTeamId] =
		data.side === 'home' ? [game.homeTeamId, game.awayTeamId] : [game.awayTeamId, game.homeTeamId];
	const columns = {
		gameId: game.id,
		teamId,
		playerId: data.player_id,
		minute: data.minute,
		penalty: data.penalty,
		ownGoal: isOwnGoal({
			ownGoal: data.own_goal,
			playerTeamId: playerTeam,
			opposingTeamId
		}),
		visible: data.visible
	};

	let id: number;
	if (existing) {
		id = existing.id;
		const changes = changedColumns(existing, columns);
		if (!Object.keys(changes).length) return { goal: existing };
		await db.update(goals).set(changes).where(eq(goals.id, id));
	} else {
		[{ id }] = await db.insert(goals).values(columns).$returningId();
	}
	const [goal] = await db.select().from(goals).where(eq(goals.id, id));
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Goal',
		oldValues: existing,
		newValues: goal
	});
	return { goal };
}

export async function deleteGoal(goal: Goal) {
	await db.delete(goals).where(eq(goals.id, goal.id));
	await audit({ action: 'delete', model: 'Goal', oldValues: goal });
}
