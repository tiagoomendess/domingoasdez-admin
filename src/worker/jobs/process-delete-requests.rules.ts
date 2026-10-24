export type DeleteRequestState = { cancelled: boolean; verified: boolean };

/**
 * What to do with an unprocessed account delete request:
 * - `close`: cancelled by the user, only marked processed (legacy);
 * - `delete`: confirmed with the emailed code, the account is anonymised;
 * - `wait`: not confirmed yet, left pending so it can still be confirmed or cancelled. Legacy
 *   deleted these too (decided 2026-10-23: only confirmed requests are carried out).
 */
export function requestAction(request: DeleteRequestState): 'close' | 'delete' | 'wait' {
	if (request.cancelled) return 'close';
	return request.verified ? 'delete' : 'wait';
}

/** Legacy `ProcessDeleteRequest`: the user row keeps its id; everything personal is cleared. */
export const ANONYMOUS_USER = {
	name: null,
	email: null,
	verified: false,
	password: null,
	emailToken: null,
	rememberToken: null
} as const;

export const ANONYMOUS_PROFILE = {
	phone: null,
	bio: null,
	picture: null,
	accountDataConsent: null,
	analyticsCookiesConsent: null,
	allDataConsent: null
} as const;
