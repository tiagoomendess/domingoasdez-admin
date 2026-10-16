import { z } from 'zod';
import { checkbox } from '#lib/server/forms.ts';
import { integer, optional, optionalId, requiredId } from '#lib/server/validation.ts';

/**
 * Same rules as the legacy `GoalController@store/update`. The credited team is picked as the
 * game's home or away side (legacy accepted any team id).
 */
export const goalFormSchema = z.object({
	game_id: requiredId(),
	side: z.enum(['home', 'away']),
	player_id: optionalId(),
	minute: optional(integer(1, 140)),
	penalty: checkbox,
	own_goal: checkbox,
	visible: checkbox
});

export type GoalForm = z.output<typeof goalFormSchema>;

/**
 * Legacy rule: a goal by a player of the other team is an own goal. Legacy compared with the
 * player's current team whatever it was, which crashed for a player without a team and turned an
 * old goal into an own goal once the player moved to any other club. Now it only applies when the
 * player currently plays for the opposing team of this game; otherwise the admin's choice stands.
 */
export function isOwnGoal(input: {
	ownGoal: boolean;
	playerTeamId: number | null;
	opposingTeamId: number;
}): boolean {
	return input.ownGoal || input.playerTeamId === input.opposingTeamId;
}
