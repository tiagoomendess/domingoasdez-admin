import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';
import { checkbox, type FieldErrors } from '#lib/server/forms.ts';
import {
	integer,
	optional,
	optionalFile,
	optionalId,
	requiredText
} from '#lib/server/validation.ts';

/** Legacy rule `picture: mimes:jpeg,jpg,png|max:20000` (kilobytes). */
export const PICTURE_MAX_BYTES = 20000 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png'] as const;

const coordinate = (min: number, max: number) => optional(z.coerce.number().min(min).max(max));

/**
 * Same rules as the legacy `PlaygroundController@store/update`. The location (picked on the map)
 * can now be set on create too; legacy only had the map on edit.
 */
export const playgroundFormSchema = z.object({
	name: requiredText(155),
	club_id: optionalId(),
	surface: requiredText(155),
	width: optional(integer(2, 200)),
	height: optional(integer(5, 200)),
	capacity: optional(integer(0, 200000)),
	priority: optional(integer(0, 100)),
	obs: optional(z.string().min(1).max(1000)),
	latitude: coordinate(-90, 90),
	longitude: coordinate(-180, 180),
	picture: optionalFile({
		maxBytes: PICTURE_MAX_BYTES,
		types: PICTURE_TYPES,
		typesLabel: 'JPEG, PNG'
	})
		// Read-only forms have no file input, so the field may be missing altogether.
		.optional()
		.transform((file) => file ?? null),
	visible: checkbox
});

export type PlaygroundForm = z.output<typeof playgroundFormSchema>;

/** Both coordinates or none (legacy stored none when either was empty). */
export function locationOf(form: PlaygroundForm, errors: FieldErrors) {
	if (form.latitude === null && form.longitude === null) return null;
	if (form.latitude === null || form.longitude === null) {
		errors.latitude = [m.playgrounds_location_both()];
		return null;
	}
	return { lat: form.latitude, lng: form.longitude };
}

export const playgroundColumns = (form: PlaygroundForm) => ({
	name: form.name,
	clubId: form.club_id,
	surface: form.surface,
	width: form.width,
	height: form.height,
	capacity: form.capacity,
	// Legacy `$request->input('priority', 0)`.
	priority: form.priority ?? 0,
	obs: form.obs,
	visible: form.visible
});

/** Legacy media library tags of the picture: `Recinto,name`. */
export const pictureTags = (name: string) => ['Recinto', name];
