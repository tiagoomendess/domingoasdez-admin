import { z } from 'zod';
import { checkbox } from '#lib/server/forms.ts';
import {
	integer,
	optionalDate,
	optionalEmail,
	optionalFile,
	optionalId,
	optionalUrl,
	required,
	requiredText
} from '#lib/server/validation.ts';

/** Legacy `ClubController` rule `emblem: mimes:png,svg|max:1000` (kilobytes). */
export const EMBLEM_MAX_BYTES = 1000 * 1024;
export const EMBLEM_TYPES = ['image/png', 'image/svg+xml'] as const;
export const EMBLEM_ACCEPT = EMBLEM_TYPES.join(',');

/**
 * Same rules as the legacy `ClubController@store/update`, with these deliberate differences:
 * - `website` is capped at 155 characters (the column size; legacy validated 280 and failed in SQL)
 *   and must be http(s)
 * - `priority` is required (the legacy form required it too; empty failed in SQL)
 * Name uniqueness and the admin user's existence are checked against the database by the action.
 */
export const clubFormSchema = z.object({
	name: requiredText(155),
	founding_date: optionalDate(),
	birthday_post_enabled: checkbox,
	emblem: optionalFile({ maxBytes: EMBLEM_MAX_BYTES, types: EMBLEM_TYPES, typesLabel: 'PNG, SVG' }),
	website: optionalUrl(155),
	contact_email: optionalEmail(155),
	admin_user_id: optionalId(),
	priority: required(integer(0, 100)),
	notifications_enabled: checkbox,
	visible: checkbox
});

export type ClubForm = z.output<typeof clubFormSchema>;

/** Form fields → `clubs` columns (the emblem is stored separately). */
export function clubColumns(form: ClubForm) {
	return {
		name: form.name,
		foundingDate: form.founding_date,
		birthdayPostEnabled: form.birthday_post_enabled,
		website: form.website,
		contactEmail: form.contact_email,
		adminUserId: form.admin_user_id,
		priority: form.priority,
		notificationsEnabled: form.notifications_enabled,
		visible: form.visible
	};
}

/** Legacy media library tags of an uploaded emblem (stored data, always in Portuguese). */
export const emblemTags = (clubName: string) => ['Emblema', 'Clube', clubName];
