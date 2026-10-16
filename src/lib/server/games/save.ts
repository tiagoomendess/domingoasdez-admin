import { and, eq, inArray } from 'drizzle-orm';
import { fromLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { gameReferees, games } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { groupExists } from '#lib/server/game-groups/index.ts';
import { playgroundExists } from '#lib/server/playgrounds/index.ts';
import { existingRefereeIds, refereeTypeRows } from '#lib/server/referees/index.ts';
import { teamExists } from '#lib/server/teams/index.ts';
import { gameFormSchema, parseReferees, type RefereeRow } from './form';
import { gameRefereeRows, type Game } from './index';

const key = (row: RefereeRow) => `${row.refereeId}:${row.typeId}`;

/**
 * Create (`existing` null) or update a game (legacy `GameController@store/update`):
 * - the date is read in the admin's timezone
 * - the referees are replaced by the submitted list
 * - `generate_image` asks the legacy job to redraw the game image
 * Fixed legacy bugs: a game could have the same team twice; a referee without a role (or the
 * reverse) dropped every referee after saving the game; the edit compared the wrong ids, so every
 * save deleted and re-created all the referees; and every save, even with no change, queued a new
 * image (now only when the game changed). The legacy page cache can't be cleared from here (see
 * `docs/architecture.md`).
 */
export async function saveGame(formData: FormData, existing: Game | null, timeZone: string) {
	const form = parseForm(gameFormSchema, formData);
	const referees = parseReferees(formData);
	if (!form.success)
		return { failure: invalid({ ...form.errors, ...referees.errors }, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = { ...referees.errors };
	if (data.home_team_id === data.away_team_id) errors.away_team_id = [m.games_same_team()];
	for (const [field, id, current] of [
		['home_team_id', data.home_team_id, existing?.homeTeamId],
		['away_team_id', data.away_team_id, existing?.awayTeamId]
	] as const) {
		if (id !== current && !(await teamExists(id))) errors[field] = [m.validation_not_found()];
	}
	if (data.game_group_id !== existing?.gameGroupId && !(await groupExists(data.game_group_id))) {
		errors.game_group_id = [m.validation_not_found()];
	}
	if (
		data.playground_id &&
		data.playground_id !== existing?.playgroundId &&
		!(await playgroundExists(data.playground_id))
	) {
		errors.playground_id = [m.validation_not_found()];
	}
	const date = fromLocalInput(data.date, timeZone);
	if (!date) errors.date = [m.validation_date()];

	const knownReferees = await existingRefereeIds(referees.rows.map((row) => row.refereeId));
	const knownTypes = new Set((await refereeTypeRows()).map((row) => row.id));
	if (
		referees.rows.some((row) => !knownReferees.has(row.refereeId) || !knownTypes.has(row.typeId))
	) {
		errors.referees = [m.validation_not_found()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	const columns = {
		homeTeamId: data.home_team_id,
		awayTeamId: data.away_team_id,
		gameGroupId: data.game_group_id,
		round: data.round,
		date: date!,
		playgroundId: data.playground_id,
		goalsHome: data.goals_home,
		goalsAway: data.goals_away,
		penaltiesHome: data.penalties_home,
		penaltiesAway: data.penalties_away,
		finished: data.finished,
		postponed: data.postponed,
		visible: data.visible,
		// Legacy create always enabled live score updates; the edit form has the switch.
		scoreboardUpdates: existing ? data.scoreboard_updates : true
	};

	const before = existing ? await gameRefereeRows(existing.id) : [];
	const wanted = new Map(referees.rows.map((row) => [key(row), row]));
	const removed = before.filter((row) => !wanted.has(key(row)));
	const kept = new Set(before.map(key));
	const added = referees.rows.filter((row) => !kept.has(key(row)));

	const changes = existing ? changedColumns(existing, columns) : columns;
	const gameChanged = Object.keys(changes).length > 0;
	if (existing && !gameChanged && !removed.length && !added.length) return { game: existing };

	const saved = await db.transaction(async (tx) => {
		let id: number;
		if (existing) {
			id = existing.id;
			if (gameChanged) {
				await tx
					.update(games)
					.set({ ...changes, generateImage: true })
					.where(eq(games.id, id));
			}
		} else {
			[{ id }] = await tx
				.insert(games)
				.values({ ...columns, generateImage: true })
				.$returningId();
		}
		if (removed.length) {
			await tx.delete(gameReferees).where(
				and(
					eq(gameReferees.gameId, id),
					inArray(
						gameReferees.id,
						removed.map((row) => row.id)
					)
				)
			);
		}
		if (added.length) {
			await tx
				.insert(gameReferees)
				.values(
					added.map((row) => ({ gameId: id, refereeId: row.refereeId, refereeTypeId: row.typeId }))
				);
		}
		const [game] = await tx.select().from(games).where(eq(games.id, id));
		return game;
	});

	// The referees go in the game's audit row, as the legacy page edited them with the game.
	const list = (rows: { refereeId: number; typeId: number }[]) =>
		rows.map(({ refereeId, typeId }) => ({ referee_id: refereeId, referee_type_id: typeId }));
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Game',
		oldValues: existing ? { ...existing, referees: list(before) } : null,
		newValues: { ...saved, referees: list(referees.rows) }
	});
	return { game: saved };
}

/** Legacy `destroy`: goals, MVP votes, flash interviews and referees cascade. */
export async function deleteGame(game: Game) {
	await db.delete(games).where(eq(games.id, game.id));
	await audit({ action: 'delete', model: 'Game', oldValues: game });
}
