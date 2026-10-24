/**
 * Pure part of the audit log (no DB / SvelteKit imports, so it can be unit tested).
 * Mirrors the legacy App\Audit::add() so rows written here look like the ones Laravel writes.
 */

export type AuditAction =
	| 'view'
	| 'create'
	| 'update'
	| 'delete'
	| 'login'
	| 'login_failed'
	| 'logout'
	| 'register'
	| 'forgot_password'
	| 'other';

/** Legacy Eloquent class names (the `model` column). */
export type AuditModel =
	| 'Article'
	| 'Club'
	| 'Competition'
	| 'Game'
	| 'GameComment'
	| 'GameGroup'
	| 'Goal'
	| 'GroupRules'
	| 'InfoReport'
	| 'Media'
	| 'Page'
	| 'Partner'
	| 'Permission'
	| 'Player'
	| 'PlayerUpdateRequest'
	| 'Playground'
	| 'Poll'
	| 'PollAnswer'
	| 'Referee'
	| 'ScoreReport'
	| 'ScoreReportBan'
	| 'Season'
	| 'SocialMediaPost'
	| 'Team'
	| 'TeamAgent'
	| 'TeamAgentHistory'
	| 'Transfer'
	| 'User'
	| 'UserBan'
	| 'UserPermission'
	| 'UserProfile'
	| 'UuidKarma'
	| 'Variable';

export type AuditValues = Record<string, unknown>;

export type AuditInput = {
	action: AuditAction;
	model: AuditModel;
	oldValues?: AuditValues | null;
	newValues?: AuditValues | null;
	extraInfo?: string | null;
};

export type AuditContext = {
	userId: number | null;
	ipAddress: string | null;
	ipCountry: string | null;
	userAgent: string | null;
	timezone: string | null;
	language: string | null;
};

/** Never written to the audit log. */
const SENSITIVE_KEYS = new Set(['password', 'remember_token', 'email_token', 'verification_code']);

/** MySQL TEXT holds 65 535 bytes. */
const TEXT_LIMIT_BYTES = 65_000;

export function truncateBytes(value: string | null | undefined, maxBytes: number): string | null {
	if (value === null || value === undefined || value === '') return null;
	const bytes = Buffer.from(value, 'utf8');
	if (bytes.length <= maxBytes) return value;
	// Drop a possibly split trailing character.
	return bytes.subarray(0, maxBytes).toString('utf8').replace(/�$/, '');
}

const snakeCase = (key: string) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

/** Eloquent toArray() shape: snake_case keys and `Y-m-d H:i:s` (UTC) dates. */
export function toLegacyValues(values: AuditValues | null | undefined): AuditValues | null {
	if (!values) return null;
	const result: AuditValues = {};
	for (const [key, value] of Object.entries(values)) {
		const column = snakeCase(key);
		if (SENSITIVE_KEYS.has(column) || value === undefined) continue;
		result[column] =
			value instanceof Date ? value.toISOString().slice(0, 19).replace('T', ' ') : value;
	}
	return result;
}

function modelId(values: AuditValues | null): number | null {
	const id = values?.id;
	return typeof id === 'number' && Number.isInteger(id) ? id : null;
}

export function buildAuditEntry(input: AuditInput, context: AuditContext) {
	const oldValues = toLegacyValues(input.oldValues);
	const newValues = toLegacyValues(input.newValues);

	const oldJson = oldValues ? JSON.stringify(oldValues, null, 4) : null;
	const newJson = newValues ? JSON.stringify(newValues, null, 4) : null;
	// Like the legacy site: an update that changed nothing is not logged.
	if (oldJson !== null && oldJson === newJson) return null;

	return {
		userId: context.userId,
		action: input.action,
		model: input.model,
		modelId: modelId(oldValues) ?? modelId(newValues),
		oldValues: truncateBytes(oldJson, TEXT_LIMIT_BYTES),
		newValues: truncateBytes(newJson, TEXT_LIMIT_BYTES),
		ipAddress: truncateBytes(context.ipAddress, 45) ?? 'Unknown',
		ipCountry: truncateBytes(context.ipCountry, 45) ?? 'Unknown',
		userAgent: truncateBytes(context.userAgent, 255),
		timezone: truncateBytes(context.timezone, 30),
		language: truncateBytes(context.language, 30),
		extraInfo: truncateBytes(input.extraInfo, 155)
	};
}
