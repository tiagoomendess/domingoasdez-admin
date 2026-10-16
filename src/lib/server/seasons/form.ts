import { z } from 'zod';
import { checkbox } from '#lib/server/forms.ts';
import {
	integer,
	optional,
	optionalFile,
	optionalText,
	required,
	requiredId
} from '#lib/server/validation.ts';

/** Legacy rule `file: mimes:jpeg,jpg,png|max:20000` (kilobytes). */
export const PICTURE_MAX_BYTES = 20000 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png'] as const;

/**
 * Same rules as the legacy `SeasonController@store/update`. The start year can't be after the end
 * year (checked by the action, like the legacy `x_bigger_than_y` error).
 */
export const seasonFormSchema = z.object({
	competition_id: requiredId(),
	start_year: required(integer(1970, 20000)),
	end_year: required(integer(1970, 20000)),
	name: optionalText(155),
	picture: optionalFile({
		maxBytes: PICTURE_MAX_BYTES,
		types: PICTURE_TYPES,
		typesLabel: 'JPEG, PNG'
	})
		// Read-only forms have no file input, so the field may be missing altogether.
		.optional()
		.transform((file) => file ?? null),
	clear_picture: checkbox,
	obs: optional(z.string().max(60000)),
	visible: checkbox
});

export type SeasonForm = z.output<typeof seasonFormSchema>;

export const seasonColumns = (form: SeasonForm) => ({
	competitionId: form.competition_id,
	startYear: form.start_year,
	endYear: form.end_year,
	name: form.name,
	obs: form.obs,
	visible: form.visible
});

/** Legacy media library tags of the picture: `name,Época` (or `season,Época` without a name). */
export const pictureTags = (name: string | null) => [name ?? 'season', 'Época'];
