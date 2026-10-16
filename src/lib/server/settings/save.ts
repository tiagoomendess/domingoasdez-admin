import { eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db/index.ts';
import { variables } from '#lib/server/db/schema.ts';
import { invalid, parseForm } from '#lib/server/forms.ts';
import { findGame } from '#lib/server/games/index.ts';
import { isUsedByCode, valueFormSchema, variableKind, variableNameSchema } from './form';
import { findVariable, type VariableRow } from './index';

/** The audit log never keeps a secret's value (the change itself is still logged). */
const auditRow = (row: VariableRow) =>
	variableKind(row.name) === 'secret' ? { ...row, value: '******' } : row;

async function parseValue(formData: FormData, name: string) {
	const kind = variableKind(name);
	const form = parseForm(valueFormSchema(kind), formData);
	if (!form.success) return { ok: false as const, failure: invalid(form.errors, form.values) };
	const value = String(form.data.value);
	if (kind === 'game' && !(await findGame(Number(value)))) {
		return {
			ok: false as const,
			failure: invalid({ value: [m.settings_game_missing()] }, form.values)
		};
	}
	return { ok: true as const, value };
}

export async function createVariable(formData: FormData) {
	const named = parseForm(variableNameSchema, formData);
	if (!named.success) return { failure: invalid(named.errors, named.values) };
	const { name } = named.data;
	if (await findVariable(name)) {
		return { failure: invalid({ name: [m.settings_name_taken()] }, named.values) };
	}
	const parsed = await parseValue(formData, name);
	if (!parsed.ok) return { failure: parsed.failure };

	await db.insert(variables).values({ name, value: parsed.value });
	const created = (await findVariable(name))!;
	await audit({ action: 'create', model: 'Variable', newValues: auditRow(created) });
	return { variable: created };
}

export async function updateVariable(formData: FormData, existing: VariableRow) {
	const kind = variableKind(existing.name);
	// A secret left blank keeps its value.
	if (kind === 'secret' && !String(formData.get('value') ?? '').trim()) {
		return { variable: existing };
	}
	const parsed = await parseValue(formData, existing.name);
	if (!parsed.ok) return { failure: parsed.failure };
	if (parsed.value === existing.value) return { variable: existing };

	await db.update(variables).set({ value: parsed.value }).where(eq(variables.name, existing.name));
	const updated = (await findVariable(existing.name))!;
	await audit({
		action: 'update',
		model: 'Variable',
		oldValues: auditRow(existing),
		newValues: auditRow(updated)
	});
	return { variable: updated };
}

/** Variables the legacy code reads stay: deleting them breaks the API or the social media job. */
export async function deleteVariable(existing: VariableRow) {
	if (isUsedByCode(existing.name)) return { message: m.settings_delete_locked() };
	await db.delete(variables).where(eq(variables.name, existing.name));
	await audit({ action: 'delete', model: 'Variable', oldValues: auditRow(existing) });
	return { ok: true as const };
}

/** Showing a secret is logged (`view`, like legacy `Audit::ACTION_VIEW`), without the value. */
export async function revealVariable(existing: VariableRow) {
	await audit({
		action: 'view',
		model: 'Variable',
		extraInfo: existing.name
	});
	return existing.value;
}
