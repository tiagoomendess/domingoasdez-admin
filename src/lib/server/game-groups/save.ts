import { eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { gameGroups } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { rulesExist } from '#lib/server/group-rules/index.ts';
import { seasonExists } from '#lib/server/seasons/index.ts';
import { groupFormSchema, groupGameCount, type GameGroup } from './index';

/** Create (`existing` null) or update a game group (legacy `GameGroupController@store/update`). */
export async function saveGroup(formData: FormData, existing: GameGroup | null) {
	const form = parseForm(groupFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	if (data.season_id !== existing?.seasonId && !(await seasonExists(data.season_id))) {
		errors.season_id = [m.validation_not_found()];
	}
	if (data.group_rules_id !== existing?.groupRulesId && !(await rulesExist(data.group_rules_id))) {
		errors.group_rules_id = [m.validation_not_found()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	const columns = { name: data.name, seasonId: data.season_id, groupRulesId: data.group_rules_id };
	let id: number;
	if (existing) {
		id = existing.id;
		const changes = changedColumns(existing, columns);
		if (!Object.keys(changes).length) return { group: existing };
		await db.update(gameGroups).set(changes).where(eq(gameGroups.id, id));
	} else {
		[{ id }] = await db.insert(gameGroups).values(columns).$returningId();
	}
	const [group] = await db.select().from(gameGroups).where(eq(gameGroups.id, id));
	await audit({
		action: existing ? 'update' : 'create',
		model: 'GameGroup',
		oldValues: existing,
		newValues: group
	});
	return { group };
}

/**
 * Legacy `destroy`, which let the foreign keys cascade to the group's games. Now only a group
 * without games can be deleted.
 */
export async function deleteGroup(group: GameGroup) {
	const games = await groupGameCount(group.id);
	if (games > 0) return { message: m.game_groups_delete_has_games({ count: games }) };
	await db.delete(gameGroups).where(eq(gameGroups.id, group.id));
	await audit({ action: 'delete', model: 'GameGroup', oldValues: group });
	return { ok: true };
}
