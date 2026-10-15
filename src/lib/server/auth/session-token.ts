/**
 * Stateless, HMAC-signed session tokens: `base64url(json).base64url(hmac-sha256)`.
 * Kept free of SvelteKit/env imports so it can be unit tested.
 */

export type SessionPayload = {
	/** User id. */
	u: number;
	/** Expiry, in seconds since the epoch. */
	e: number;
	/** Fingerprint of the password hash: changing the password signs out every session. */
	p: string;
	/** "Keep me signed in" (longer lifetime). */
	r: boolean;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array) {
	return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(value: string) {
	return new Uint8Array(Buffer.from(value, 'base64url'));
}

async function hmacKey(secret: string) {
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

/** Short, non-reversible fingerprint of a password hash (empty for password-less accounts). */
export async function passwordFingerprint(passwordHash: string | null | undefined) {
	if (!passwordHash) return '';
	const digest = await crypto.subtle.digest('SHA-256', encoder.encode(passwordHash));
	return toBase64Url(new Uint8Array(digest)).slice(0, 16);
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
	const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
	const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
	return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the payload when the signature is valid and the token has not expired. */
export async function verifySession(
	token: string | undefined,
	secret: string,
	nowSeconds = Math.floor(Date.now() / 1000)
): Promise<SessionPayload | null> {
	if (!token) return null;
	const [body, signature, ...rest] = token.split('.');
	if (!body || !signature || rest.length > 0) return null;

	try {
		// crypto.subtle.verify compares in constant time.
		const valid = await crypto.subtle.verify(
			'HMAC',
			await hmacKey(secret),
			fromBase64Url(signature),
			encoder.encode(body)
		);
		if (!valid) return null;

		const payload = JSON.parse(decoder.decode(fromBase64Url(body))) as Partial<SessionPayload>;
		if (
			typeof payload.u !== 'number' ||
			typeof payload.e !== 'number' ||
			typeof payload.p !== 'string' ||
			payload.e <= nowSeconds
		) {
			return null;
		}
		return { u: payload.u, e: payload.e, p: payload.p, r: payload.r === true };
	} catch {
		return null;
	}
}
