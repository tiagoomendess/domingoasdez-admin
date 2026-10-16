import { z } from 'zod';
import { isLocalDateTime } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { checkbox, type FieldErrors } from '#lib/server/forms.ts';
import { integer, optional, optionalId, required, requiredId } from '#lib/server/validation.ts';

const score = () => optional(integer(0, 99));

/**
 * Same rules as the legacy `GameController@store/update`. The date and hour are one
 * `datetime-local` read in the admin's timezone (the legacy form had a timezone select).
 * Teams, group, playground and referees are checked against the database by the action.
 */
export const gameFormSchema = z.object({
	home_team_id: requiredId(),
	away_team_id: requiredId(),
	game_group_id: requiredId(),
	round: required(integer(0, 9999)),
	date: required(z.string().refine(isLocalDateTime, { error: () => m.validation_date() })),
	playground_id: optionalId(),
	goals_home: score(),
	goals_away: score(),
	penalties_home: score(),
	penalties_away: score(),
	finished: checkbox,
	postponed: checkbox,
	visible: checkbox,
	scoreboard_updates: checkbox
});

export type GameForm = z.output<typeof gameFormSchema>;

/** Legacy rule `referees_id: max:8`. */
export const MAX_REFEREES = 8;

export type RefereeRow = { refereeId: number; typeId: number };

/**
 * The referees, posted as `referee_N` / `type_N` pairs. Fixed legacy bugs: a referee without a
 * role (or the reverse) silently skipped every referee after the game was saved; now each row
 * needs both, and a referee can't be listed twice.
 */
export function parseReferees(formData: FormData): { rows: RefereeRow[]; errors: FieldErrors } {
	const indexes = [...new Set([...formData.keys()].map((key) => /^referee_(\d+)$/.exec(key)?.[1]))]
		.filter((index): index is string => index !== undefined)
		.sort((a, b) => Number(a) - Number(b));

	const rows: RefereeRow[] = [];
	const errors: FieldErrors = {};
	const seen = new Set<number>();
	for (const index of indexes) {
		const refereeId = Number(formData.get(`referee_${index}`) || 0);
		const typeId = Number(formData.get(`type_${index}`) || 0);
		if (!refereeId && !typeId) continue;
		if (!Number.isInteger(refereeId) || refereeId < 1) {
			errors[`referee_${index}`] = [m.validation_required()];
			continue;
		}
		if (!Number.isInteger(typeId) || typeId < 1) {
			errors[`type_${index}`] = [m.validation_required()];
			continue;
		}
		if (seen.has(refereeId)) {
			errors[`referee_${index}`] = [m.games_referee_repeated()];
			continue;
		}
		seen.add(refereeId);
		rows.push({ refereeId, typeId });
	}
	if (rows.length > MAX_REFEREES) errors.referees = [m.games_referees_max({ max: MAX_REFEREES })];
	return { rows, errors };
}
