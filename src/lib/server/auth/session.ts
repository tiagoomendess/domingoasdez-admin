import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';
import { SESSION_SECRET } from '$app/env/private';
import {
	passwordFingerprint,
	signSession,
	verifySession,
	type SessionPayload
} from './session-token';

/** Separate from the public site's `dad_session`: signing in to one never signs in to the other. */
export const SESSION_COOKIE = 'dad_admin_session';

const HOUR = 60 * 60;
/** Idle timeout. The token slides forward while the admin is in use. */
const SESSION_TTL = 12 * HOUR;
/** "Keep me signed in". */
const REMEMBER_TTL = 30 * 24 * HOUR;

const now = () => Math.floor(Date.now() / 1000);

async function writeCookie(cookies: Cookies, payload: SessionPayload) {
	cookies.set(SESSION_COOKIE, await signSession(payload, SESSION_SECRET), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		// Without "remember", the cookie dies with the browser (and the token after the idle timeout).
		maxAge: payload.r ? REMEMBER_TTL : undefined
	});
}

export async function startSession(
	cookies: Cookies,
	user: { id: number; passwordHash: string | null },
	remember: boolean
) {
	await writeCookie(cookies, {
		u: user.id,
		e: now() + (remember ? REMEMBER_TTL : SESSION_TTL),
		p: await passwordFingerprint(user.passwordHash),
		r: remember
	});
}

export function readSession(cookies: Cookies) {
	return verifySession(cookies.get(SESSION_COOKIE), SESSION_SECRET);
}

/** Checks the session still belongs to the current password (changed passwords revoke sessions). */
export async function sessionMatchesPassword(session: SessionPayload, passwordHash: string | null) {
	return session.p === (await passwordFingerprint(passwordHash));
}

/** Slides the expiry forward once less than half of the lifetime is left. */
export async function refreshSession(cookies: Cookies, session: SessionPayload) {
	const ttl = session.r ? REMEMBER_TTL : SESSION_TTL;
	if (session.e - now() > ttl / 2) return;
	await writeCookie(cookies, { ...session, e: now() + ttl });
}

export function endSession(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
