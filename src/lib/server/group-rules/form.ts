import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';
import type { FieldErrors } from '#lib/server/forms.ts';
import { integer, optional, required, requiredText } from '#lib/server/validation.ts';

export const RULE_TYPES = ['points', 'elimination', 'friendly', 'other'] as const;

/** The script the legacy site runs for the AFPB tie-breaker (the new app recognises it by name). */
export const AFPB_SCRIPT = 'return afpb_points_2018(table, group, round);';

export type TieBreaker = 'none' | 'afpb' | 'custom';

/** Which choice a stored script is (the form's select). */
export function tieBreakerOf(script: string | null): TieBreaker {
	const normalized = script?.replace(/\s+/g, '') ?? '';
	if (!normalized) return 'none';
	return normalized === AFPB_SCRIPT.replace(/\s+/g, '') ? 'afpb' : 'custom';
}

/**
 * Legacy `GroupRulesController@store/update`. The tie-breaker is now picked from the known scripts
 * (or typed in, as before); the name is unique (checked by the action, legacy failed in SQL).
 */
export const ruleFormSchema = z.object({
	name: requiredText(154),
	type: z.enum(RULE_TYPES),
	promotes: required(integer(0, 100)),
	relegates: required(integer(0, 100)),
	tie_breaker: z.enum(['none', 'afpb', 'custom']),
	tie_breaker_script: optional(z.string().max(60000))
});

export type RuleForm = z.output<typeof ruleFormSchema>;

/** The `tie_breaker_script` column for the chosen tie-breaker. */
export function scriptFor(form: RuleForm): string | null {
	if (form.tie_breaker === 'none') return null;
	if (form.tie_breaker === 'afpb') return AFPB_SCRIPT;
	return form.tie_breaker_script;
}

export type PositionRow = { positions: string; color: string; label: string };

const POSITIONS = /^\d+(,\d+)*$/;
const COLOR = /^#[0-9a-f]{6}$/i;

/**
 * The classification bands (`group_rules_positions`), posted as `positions_N` / `color_N` /
 * `label_N`. Legacy silently dropped a row with any empty field; now a fully empty row is
 * ignored and a partly filled one is an error. Positions are a comma list ("1,2,3", spaces
 * allowed), the colour is `#rrggbb`, and a position can't be in two bands.
 */
export function parsePositions(formData: FormData): { rows: PositionRow[]; errors: FieldErrors } {
	const indexes = [
		...new Set([...formData.keys()].map((key) => /^positions_(\d+)$/.exec(key)?.[1]))
	]
		.filter((index): index is string => index !== undefined)
		.sort((a, b) => Number(a) - Number(b));

	const rows: PositionRow[] = [];
	const errors: FieldErrors = {};
	const taken = new Map<number, string>();
	for (const index of indexes) {
		const read = (name: string) => String(formData.get(`${name}_${index}`) ?? '').trim();
		const positions = read('positions').replace(/\s+/g, '');
		const color = read('color').toLowerCase();
		const label = read('label');
		if (!positions && !label) continue;

		if (!POSITIONS.test(positions)) {
			errors[`positions_${index}`] = [m.group_rules_positions_format()];
		} else {
			for (const position of positions.split(',').map(Number)) {
				const other = taken.get(position);
				if (other !== undefined && other !== index) {
					errors[`positions_${index}`] = [m.group_rules_position_repeated({ position })];
				}
				taken.set(position, index);
			}
		}
		if (!COLOR.test(color)) errors[`color_${index}`] = [m.validation_invalid()];
		if (!label) errors[`label_${index}`] = [m.validation_required()];
		else if (label.length > 155) errors[`label_${index}`] = [m.validation_max_length({ max: 155 })];

		rows.push({ positions, color, label });
	}
	return { rows, errors };
}
