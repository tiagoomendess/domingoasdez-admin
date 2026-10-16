import { eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { groupRules, groupRulesPositions } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { parsePositions, ruleFormSchema, scriptFor } from './form';
import { isRulesNameTaken, rulesGroupCount, rulesPositions, type GroupRules } from './index';

/** Positions compared by content, to skip rewriting (and auditing) unchanged bands. */
const samePositions = (
	a: { positions: string; color: string; label: string }[],
	b: { positions: string; color: string; label: string }[]
) =>
	a.length === b.length &&
	a.every(
		(row, i) =>
			row.positions === b[i].positions && row.color === b[i].color && row.label === b[i].label
	);

/**
 * Create (`existing` null) or update group rules (legacy `GroupRulesController@store/update`):
 * the classification bands are replaced as a whole, like the legacy "delete and recreate".
 * Fixed legacy bugs: a repeated name failed in SQL (unique index), and the bands were rewritten
 * outside a transaction (a failure could leave the rules without them). Promotions and
 * relegations can now be set on create too (legacy forced 0 there).
 */
export async function saveRules(formData: FormData, existing: GroupRules | null) {
	const form = parseForm(ruleFormSchema, formData);
	const bands = parsePositions(formData);
	if (!form.success) return { failure: invalid({ ...form.errors, ...bands.errors }, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = { ...bands.errors };
	if (data.name !== existing?.name && (await isRulesNameTaken(data.name, existing?.id))) {
		errors.name = [m.group_rules_name_taken()];
	}
	if (data.tie_breaker === 'custom' && !data.tie_breaker_script) {
		errors.tie_breaker_script = [m.validation_required()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	const columns = {
		name: data.name,
		type: data.type,
		promotes: data.promotes,
		relegates: data.relegates,
		tieBreakerScript: scriptFor(data)
	};
	const oldBands = existing ? await rulesPositions(existing.id) : [];
	const bandsChanged = !samePositions(oldBands, bands.rows);
	const changes = existing ? changedColumns(existing, columns) : columns;
	if (existing && !bandsChanged && !Object.keys(changes).length) return { rules: existing };

	const saved = await db.transaction(async (tx) => {
		let id: number;
		if (existing) {
			id = existing.id;
			if (Object.keys(changes).length) {
				await tx.update(groupRules).set(changes).where(eq(groupRules.id, id));
			}
		} else {
			[{ id }] = await tx.insert(groupRules).values(columns).$returningId();
		}
		if (bandsChanged) {
			await tx.delete(groupRulesPositions).where(eq(groupRulesPositions.groupRulesId, id));
			if (bands.rows.length) {
				await tx
					.insert(groupRulesPositions)
					.values(bands.rows.map((row) => ({ groupRulesId: id, ...row })));
			}
		}
		const [rules] = await tx.select().from(groupRules).where(eq(groupRules.id, id));
		return rules;
	});

	// The bands go in the audit row with the rules, as one change.
	const newBands = bandsChanged ? bands.rows : oldBands;
	const strip = (rows: typeof bands.rows) =>
		rows.map(({ positions, color, label }) => ({ positions, color, label }));
	await audit({
		action: existing ? 'update' : 'create',
		model: 'GroupRules',
		oldValues: existing ? { ...existing, positions: strip(oldBands) } : null,
		newValues: { ...saved, positions: strip(newBands) }
	});
	return { rules: saved };
}

/**
 * New: the legacy site had no delete. Only rules no group uses can go (deleting used ones would
 * cascade to the groups and all their games).
 */
export async function deleteRules(rules: GroupRules) {
	if ((await rulesGroupCount(rules.id)) > 0) return { message: m.group_rules_delete_in_use() };
	const positions = await rulesPositions(rules.id);
	await db.delete(groupRules).where(eq(groupRules.id, rules.id));
	await audit({
		action: 'delete',
		model: 'GroupRules',
		oldValues: {
			...rules,
			positions: positions.map(({ positions, color, label }) => ({ positions, color, label }))
		}
	});
	return { ok: true };
}
