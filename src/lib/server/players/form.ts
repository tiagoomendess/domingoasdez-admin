import { z } from 'zod';
import { playerPositions } from '#lib/server/db/schema.ts';
import { checkbox } from '#lib/server/forms.ts';
import {
	optional,
	optionalDate,
	optionalEmail,
	optionalFile,
	optionalId,
	optionalUrl,
	required
} from '#lib/server/validation.ts';

/** Legacy rule `picture: mimes:png,jpg|max:2000` (kilobytes). */
export const PICTURE_MAX_BYTES = 2000 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png'] as const;
export const PICTURE_ACCEPT = PICTURE_TYPES.join(',');
/** A picture link is downloaded by the server; legacy had no limit. */
export const PICTURE_URL_MAX_BYTES = 20 * 1024 * 1024;

const text = (min: number, max: number) => z.string().min(min).max(max);

/**
 * Same rules as the legacy `PlayerController@store/update`, with these differences:
 * - `position` must be one of the column's values (legacy accepted any 3–10 characters, which
 *   failed in SQL for anything the form did not offer)
 * - the association number is checked for uniqueness by the action (legacy failed in SQL)
 * The team's existence (`exists:teams,id`) is checked by the action too.
 */
export const playerFormSchema = z.object({
	name: required(text(3, 155)),
	nickname: optional(text(2, 155)),
	association_id: optional(z.string().max(155)),
	position: z.enum(playerPositions),
	team_id: optionalId(),
	birth_date: optionalDate(),
	phone: optional(text(6, 14)),
	email: optionalEmail(100),
	facebook_profile: optionalUrl(280),
	obs: optional(text(6, 3000)),
	picture: optionalFile({
		maxBytes: PICTURE_MAX_BYTES,
		types: PICTURE_TYPES,
		typesLabel: 'JPEG, PNG'
	})
		// Read-only forms have no picture input, so the field may be missing altogether.
		.optional()
		.transform((file) => file ?? null),
	picture_url: optionalUrl(280),
	visible: checkbox
});

export type PlayerForm = z.output<typeof playerFormSchema>;

/**
 * Legacy `ucwords(strtolower($name))`. PHP's byte functions left accented capitals as typed
 * ("JOSÉ" → "JosÉ"); this lowercases and capitalises every letter.
 */
export function titleCase(name: string): string {
	return name
		.toLocaleLowerCase('pt-PT')
		.replace(
			/(^|[\s\t\r\n\f\v])(\p{L})/gu,
			(_, space: string, letter: string) => space + letter.toLocaleUpperCase('pt-PT')
		);
}

/** Calendar date ↔ the `birth_date` TIMESTAMP (`YYYY-MM-DD 00:00:00`). */
export const birthDateValue = (date: string | null) => (date ? `${date} 00:00:00` : null);
export const birthDateInput = (stored: string | null) => stored?.slice(0, 10) ?? '';

/** Form fields → `players` columns (the picture and the transfer are handled separately). */
export function playerColumns(form: PlayerForm) {
	return {
		name: titleCase(form.name),
		nickname: form.nickname,
		associationId: form.association_id,
		position: form.position,
		teamId: form.team_id,
		birthDate: birthDateValue(form.birth_date),
		phone: form.phone,
		email: form.email,
		facebookProfile: form.facebook_profile,
		obs: form.obs,
		visible: form.visible
	};
}

/** Legacy media library tags of an uploaded picture (stored data, always in Portuguese). */
export const pictureTags = (name: string, nickname: string | null) =>
	['Jogador', name, nickname].filter((tag): tag is string => Boolean(tag));
