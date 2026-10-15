import { z } from 'zod';
import { checkbox } from '#lib/server/forms.ts';
import {
	integer,
	optionalFile,
	required,
	requiredText,
	requiredUrl
} from '#lib/server/validation.ts';

/** Legacy `PartnerController` rule `picture: mimes:jpeg,jpg,png|max:20000` (kilobytes). */
export const PICTURE_MAX_BYTES = 20000 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png'] as const;

/**
 * Same rules as the legacy `PartnerController@store/update`, except that `url` is capped at 150
 * characters (the column size; legacy validated 255 and failed in SQL) and must be http(s).
 * The picture is required on create and optional on edit, where it replaces the current one (the
 * legacy edit form disabled it); the action enforces both.
 */
export const partnerFormSchema = z.object({
	name: requiredText(50),
	url: requiredUrl(150),
	priority: required(integer(1, 100)),
	picture: optionalFile({
		maxBytes: PICTURE_MAX_BYTES,
		types: PICTURE_TYPES,
		typesLabel: 'JPEG, PNG'
	})
		// Read-only forms have no picture input, so the field may be missing altogether.
		.optional()
		.transform((file) => file ?? null),
	visible: checkbox
});

export type PartnerForm = z.output<typeof partnerFormSchema>;

/** Form fields → `partners` columns (the picture is stored separately). */
export function partnerColumns(form: PartnerForm) {
	return { name: form.name, url: form.url, priority: form.priority, visible: form.visible };
}

/** Legacy media library tags of the picture: the name with spaces turned into commas. */
export const pictureTags = (partnerName: string) => partnerName.split(' ');
