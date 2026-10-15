import { eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { clubExists } from '#lib/server/clubs/index.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { teams } from '#lib/server/db/schema.ts';
import { invalid, parseForm } from '#lib/server/forms.ts';
import { teamColumns, teamFormSchema } from './form';
import type { Team } from './index';

/**
 * Create (`existing` null) or update a team from the submitted form (legacy
 * `TeamController@store/update`). Returns the saved row, or the `fail()` the action must return.
 */
export async function saveTeam(formData: FormData, existing: Team | null) {
	const form = parseForm(teamFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	if (data.club_id !== existing?.clubId && !(await clubExists(data.club_id))) {
		return { failure: invalid({ club_id: [m.validation_not_found()] }, values) };
	}

	const columns = teamColumns(data);
	const team = await db.transaction(async (tx) => {
		let id: number;
		if (existing) {
			id = existing.id;
			const changes = changedColumns(existing, columns);
			if (Object.keys(changes).length) await tx.update(teams).set(changes).where(eq(teams.id, id));
		} else {
			[{ id }] = await tx.insert(teams).values(columns).$returningId();
		}
		const [row] = await tx.select().from(teams).where(eq(teams.id, id));
		return row;
	});

	await audit({
		action: existing ? 'update' : 'create',
		model: 'Team',
		oldValues: existing,
		newValues: team
	});
	return { team };
}
