import { z } from 'zod';
import { checkbox } from '#lib/server/forms.ts';
import { integer, optionalFile, required, requiredText } from '#lib/server/validation.ts';

/** Legacy rule `file: mimes:jpeg,jpg,png|max:20000` (kilobytes). */
export const PICTURE_MAX_BYTES = 20000 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png'] as const;

/**
 * Same rules as the legacy `CompetitionController@store/update`. The logo is required on create
 * and optional on edit (the action enforces it); the name is unique (checked by the action).
 */
export const competitionFormSchema = z.object({
	name: requiredText(155),
	priority: required(integer(0, 100000)),
	picture: optionalFile({
		maxBytes: PICTURE_MAX_BYTES,
		types: PICTURE_TYPES,
		typesLabel: 'JPEG, PNG'
	})
		// Read-only forms have no file input, so the field may be missing altogether.
		.optional()
		.transform((file) => file ?? null),
	visible: checkbox,
	social_media_enabled: checkbox
});

export type CompetitionForm = z.output<typeof competitionFormSchema>;

export const competitionColumns = (form: CompetitionForm) => ({
	name: form.name,
	priority: form.priority,
	visible: form.visible,
	socialMediaEnabled: form.social_media_enabled
});

/** Legacy media library tags of the logo: `name,Competição`. */
export const pictureTags = (name: string) => [name, 'Competição'];
