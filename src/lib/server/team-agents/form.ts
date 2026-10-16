import { z } from 'zod';
import { teamAgentTypes } from '#lib/server/db/schema.ts';
import {
	optional,
	optionalDate,
	optionalEmail,
	optionalFile,
	optionalId,
	optionalUrl,
	required
} from '#lib/server/validation.ts';

/** Legacy rule `picture: mimes:png,jpg,jpeg|max:2000` (kilobytes). */
export const PICTURE_MAX_BYTES = 2000 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png'] as const;

const text = (min: number, max: number) => z.string().min(min).max(max);

/**
 * Same rules as the legacy `TeamAgentController::validateRequest()`. The player's and team's
 * existence (`exists:…`) is checked by the action.
 */
export const agentFormSchema = z.object({
	name: required(text(3, 155)),
	agent_type: z.enum(teamAgentTypes),
	team_id: optionalId(),
	player_id: optionalId(),
	birth_date: optionalDate(),
	external_id: optional(z.string().max(155)),
	email: optionalEmail(100),
	phone: optional(text(6, 14)),
	picture: optionalFile({
		maxBytes: PICTURE_MAX_BYTES,
		types: PICTURE_TYPES,
		typesLabel: 'JPEG, PNG'
	})
		// Read-only forms have no picture input, so the field may be missing altogether.
		.optional()
		.transform((file) => file ?? null),
	picture_url: optionalUrl(280)
});

export type AgentForm = z.output<typeof agentFormSchema>;

/** Form fields → `team_agents` columns (the picture is stored separately). */
export function agentColumns(form: AgentForm) {
	return {
		name: form.name,
		agentType: form.agent_type,
		teamId: form.team_id,
		playerId: form.player_id,
		// A free-text VARCHAR in the legacy schema; the form sends a calendar date.
		birthDate: form.birth_date,
		externalId: form.external_id,
		email: form.email,
		phone: form.phone
	};
}

/** Legacy media library tags of an uploaded picture (stored data, always in Portuguese). */
export const pictureTags = (name: string) => ['Técnico', name];

/** Legacy `TeamAgentHistoryController::validateRequest()`; the date is required, as in its form. */
export const historyFormSchema = z.object({
	history_id: optionalId(),
	team_id: optionalId(),
	agent_type: z.enum(teamAgentTypes),
	started_at: required(z.iso.date())
});

/** A calendar date as the `started_at` instant (midnight UTC, what the legacy datepicker stored). */
export const startOfDay = (date: string) => new Date(`${date}T00:00:00Z`);
