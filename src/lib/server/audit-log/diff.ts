/** Pure helpers for reading audit rows (legacy `Audit::add()` stores JSON text). */

export type AuditValuesText = string | null;

/** The stored JSON as an object; `raw` keeps text that isn't a JSON object (shown as is). */
export function parseValues(text: AuditValuesText): {
	values: Record<string, unknown> | null;
	raw: string | null;
} {
	if (!text?.trim()) return { values: null, raw: null };
	try {
		const parsed: unknown = JSON.parse(text);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return { values: parsed as Record<string, unknown>, raw: null };
		}
	} catch {
		// Not JSON: fall through.
	}
	return { values: null, raw: text };
}

/** How a value reads in the diff: text as is, everything else as (pretty) JSON. */
export function formatValue(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value === 'string') return value;
	return JSON.stringify(value, null, 2);
}

/** Never shown, even when an old row kept them (the admin's own writes strip them). */
const SECRET_KEYS = new Set([
	'password',
	'remember_token',
	'email_token',
	'verification_code',
	'api_access_token'
]);
export const MASK = '••••••';

const shown = (values: Record<string, unknown>, key: string) =>
	SECRET_KEYS.has(key) && values[key] ? MASK : formatValue(values[key]);

export type DiffRow = {
	key: string;
	/** `undefined`: the field isn't in that side (a create has no "before"). */
	before: string | null | undefined;
	after: string | null | undefined;
	changed: boolean;
};

/** Every field of either side, in the "after" order, marking the ones that changed. */
export function diffValues(
	before: Record<string, unknown> | null,
	after: Record<string, unknown> | null
): DiffRow[] {
	const keys = [...new Set([...Object.keys(after ?? {}), ...Object.keys(before ?? {})])];
	return keys.map((key) => {
		const old = before && key in before ? shown(before, key) : undefined;
		const next = after && key in after ? shown(after, key) : undefined;
		// Compare the real values: a masked password change still counts as a change.
		const changed =
			before && after
				? formatValue(before[key]) !== formatValue(after[key]) ||
					!(key in before) ||
					!(key in after)
				: true;
		return { key, before: old, after: next, changed };
	});
}

/** Bookkeeping columns every save touches: not worth listing as "what changed". */
const NOISE = new Set(['updated_at', 'created_at']);

/** The fields an update changed (for the list); empty for creates and deletes. */
export function changedFields(oldText: AuditValuesText, newText: AuditValuesText): string[] {
	const before = parseValues(oldText).values;
	const after = parseValues(newText).values;
	if (!before || !after) return [];
	return diffValues(before, after)
		.filter((row) => row.changed && !NOISE.has(row.key))
		.map((row) => row.key);
}

/** Admin sections that have an edit page for a legacy model name. */
const MODEL_ROUTES: Record<string, string> = {
	Article: '/articles',
	Club: '/clubs',
	Competition: '/competitions',
	Game: '/games',
	GameComment: '/game-comments',
	GameGroup: '/game-groups',
	Goal: '/goals',
	GroupRules: '/group-rules',
	InfoReport: '/info-reports',
	Media: '/media',
	Page: '/pages',
	Partner: '/partners',
	Permission: '/permissions',
	Player: '/players',
	PlayerUpdateRequest: '/player-update-requests',
	Playground: '/playgrounds',
	Poll: '/polls',
	Season: '/seasons',
	Team: '/teams',
	TeamAgent: '/team-agents',
	Transfer: '/transfers',
	User: '/users'
};

/** The admin page of the audited row, when the section has one (`null` after a delete). */
export function entityPath(
	model: string | null,
	modelId: number | null,
	action: string
): string | null {
	if (!model || !modelId || action === 'delete') return null;
	const base = MODEL_ROUTES[model];
	return base ? `${base}/${modelId}` : null;
}
