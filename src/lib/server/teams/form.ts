import { z } from 'zod';
import { checkbox } from '#lib/server/forms.ts';
import { optionalEmail, requiredId, requiredText } from '#lib/server/validation.ts';

/**
 * Same rules as the legacy `TeamController@store/update`. The club's existence
 * (`exists:clubs,id`) is checked against the database by the action.
 */
export const teamFormSchema = z.object({
	club_id: requiredId(),
	name: requiredText(155),
	contact_email: optionalEmail(155),
	visible: checkbox
});

export type TeamForm = z.output<typeof teamFormSchema>;

export function teamColumns(form: TeamForm) {
	return {
		clubId: form.club_id,
		name: form.name,
		contactEmail: form.contact_email,
		visible: form.visible
	};
}
