import { z } from 'zod';
import { playerPositions } from '#lib/server/db/schema.ts';
import { optional, optionalId } from '#lib/server/validation.ts';

/**
 * The legacy `PlayerUpdateRequest` rules, as pure functions: which fields a request changes
 * (`getChanges()`), the team suggested for its club (`suggestTeam()`) and the review forms.
 */

export const REQUEST_FIELDS = [
	'name',
	'nickname',
	'picture',
	'association_id',
	'phone',
	'email',
	'facebook_profile',
	'birth_date',
	'position',
	'club',
	'obs'
] as const;

export type RequestField = (typeof REQUEST_FIELDS)[number];

/** `club_name` values that mean "leaves the club". */
export const NO_CLUB = ['no_club', 'none'];
export const isNoClub = (clubName: string | null) =>
	clubName !== null && NO_CLUB.includes(clubName);

export type RequestValues = {
	playerId: number | null;
	name: string | null;
	nickname: string | null;
	pictureUrl: string | null;
	associationId: string | null;
	phone: string | null;
	email: string | null;
	facebookProfile: string | null;
	birthDate: string | null;
	position: string | null;
	obs: string | null;
	clubName: string | null;
};

export type PlayerValues = {
	name: string;
	nickname: string | null;
	picture: string | null;
	associationId: string | null;
	phone: string | null;
	email: string | null;
	facebookProfile: string | null;
	birthDate: string | null;
	position: string;
	teamId: number | null;
	clubName: string | null;
};

export type FieldRow = {
	field: RequestField;
	/** The player's value (null for a new player or an empty field). */
	current: string | null;
	requested: string;
	/** Applying it would change the player. Unchanged rows are shown but can't be selected. */
	changed: boolean;
};

const SIMPLE_FIELDS = [
	['name', 'name', 'name'],
	['nickname', 'nickname', 'nickname'],
	['association_id', 'associationId', 'associationId'],
	['phone', 'phone', 'phone'],
	['email', 'email', 'email'],
	['facebook_profile', 'facebookProfile', 'facebookProfile'],
	['birth_date', 'birthDate', 'birthDate'],
	['position', 'position', 'position']
] as const satisfies readonly [RequestField, keyof RequestValues, keyof PlayerValues][];

/**
 * Legacy `getChanges()`: only the fields the request sends. On an update, a field is a change
 * when it differs from the player; a new picture always is (it is a link, the player has a
 * stored file). `obs` is the source's note: it becomes the player's notes only for a new player.
 * Fixed legacy bug: "no club" counted as a change for a player who already had no team, which
 * recorded a new "no club" transfer on every approval.
 */
export function compareRequest(request: RequestValues, player: PlayerValues | null): FieldRow[] {
	const rows: FieldRow[] = [];
	for (const [field, requestKey, playerKey] of SIMPLE_FIELDS) {
		const requested = request[requestKey];
		if (requested === null || requested === '') continue;
		const current = player ? (player[playerKey] as string | null) : null;
		rows.push({ field, current, requested: String(requested), changed: requested !== current });
	}

	if (request.pictureUrl) {
		rows.push({
			field: 'picture',
			current: player?.picture ?? null,
			requested: request.pictureUrl,
			changed: true
		});
	}

	if (request.clubName) {
		const leaves = isNoClub(request.clubName);
		const changed = player
			? leaves
				? player.teamId !== null
				: request.clubName !== player.clubName
			: true;
		rows.push({
			field: 'club',
			current: player?.clubName ?? null,
			requested: request.clubName,
			changed
		});
	}

	if (!request.playerId && request.obs) {
		rows.push({ field: 'obs', current: null, requested: request.obs, changed: true });
	}

	return rows.sort((a, b) => REQUEST_FIELDS.indexOf(a.field) - REQUEST_FIELDS.indexOf(b.field));
}

// --- Team suggestion (legacy `suggestTeam()`) ---

const ACCENTS: Record<string, string> = {
	á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
	é: 'e', è: 'e', ê: 'e', ë: 'e',
	í: 'i', ì: 'i', î: 'i', ï: 'i',
	ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
	ú: 'u', ù: 'u', û: 'u', ü: 'u',
	ç: 'c'
}; // prettier-ignore

export function normalizeTeamLabel(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[áàâãäéèêëíìîïóòôõöúùûüç]/g, (letter) => ACCENTS[letter])
		.replace(/\s+/g, ' ');
}

/** PHP `similar_text()`: characters in common, by recursive longest common substrings. */
export function similarText(a: string, b: string): number {
	if (!a.length || !b.length) return 0;
	let max = 0;
	let posA = 0;
	let posB = 0;
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			let k = 0;
			while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++;
			if (k > max) [max, posA, posB] = [k, i, j];
		}
	}
	if (!max) return 0;
	return (
		max +
		similarText(a.slice(0, posA), b.slice(0, posB)) +
		similarText(a.slice(posA + max), b.slice(posB + max))
	);
}

function teamMatchScore(target: string, candidate: string): number {
	if (!target || !candidate) return 0;
	if (target === candidate) return 1;
	const targetTokens = target.split(' ');
	const candidateTokens = candidate.split(' ');
	const shared = targetTokens.filter((token) => candidateTokens.includes(token)).length;
	const union = new Set([...targetTokens, ...candidateTokens]).size;
	const jaccard = union ? shared / union : 0;
	const percent = (similarText(target, candidate) * 2) / (target.length + candidate.length);
	const similar = percent * (1 - 0.25 * Math.abs(targetTokens.length - candidateTokens.length));
	return Math.max(0, jaccard, similar);
}

/**
 * The club team matching the federation's squad name (`team`): "Seniores Masculino" is the
 * club's "Séniores"; anything else is matched by name (score ≥ 0.8).
 */
export function suggestTeam<Team extends { name: string }>(
	squad: string | null,
	teams: Team[]
): Team | null {
	if (!squad || !teams.length) return null;
	let target = normalizeTeamLabel(squad);
	if (target === 'seniores masculino') target = 'seniores';

	let best: Team | null = null;
	let bestScore = 0;
	for (const team of teams) {
		const score = teamMatchScore(target, normalizeTeamLabel(team.name));
		const preferAccented = target === 'seniores' && team.name === 'Séniores';
		if (score > bestScore || (score === bestScore && score > 0 && preferAccented)) {
			bestScore = score;
			best = team;
		}
	}
	return bestScore >= 0.8 ? best : null;
}

// --- Review forms ---

/** Repeated checkboxes: one value is a string, several an array, none is missing. */
const selectedFields = z.preprocess(
	(value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
	z.array(z.enum(REQUEST_FIELDS))
);

/** Approve: the fields to apply (all changes are ticked by default) and the club's team. */
export const approveSchema = z.object({
	fields: selectedFields,
	team_id: optionalId(),
	review_notes: optional(z.string().max(1000))
});

/** Legacy `deny`: `review_notes` required, 3 to 1000 characters. */
export const denySchema = z.object({
	review_notes: z.preprocess(
		(value) => (typeof value === 'string' ? value.trim() : value),
		z.string().min(3).max(1000)
	)
});

export const isPosition = (value: string): value is (typeof playerPositions)[number] =>
	(playerPositions as readonly string[]).includes(value);
