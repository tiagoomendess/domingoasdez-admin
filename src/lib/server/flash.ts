import type { Cookies } from '@sveltejs/kit';
import type { Flash } from '#lib/flash.ts';

/**
 * One-time message shown as a toast on the next page, for actions that redirect (create, save,
 * delete). Kept in a short-lived cookie and read by the (app) layout load, which re-runs after
 * every redirect from a form action (enhanced or not).
 */
const COOKIE = 'dad_admin_flash';
const MAX_MESSAGE_LENGTH = 300;

export function setFlash(cookies: Cookies, flash: Flash): void {
	cookies.set(
		COOKIE,
		JSON.stringify({ ...flash, message: flash.message.slice(0, MAX_MESSAGE_LENGTH) }),
		{ path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 }
	);
}

/** Returns the pending message (if any) and removes it. */
export function takeFlash(cookies: Cookies): Flash | null {
	const raw = cookies.get(COOKIE);
	if (raw === undefined) return null;
	cookies.delete(COOKIE, { path: '/' });
	return parseFlash(raw);
}

export function parseFlash(raw: string): Flash | null {
	try {
		const value: unknown = JSON.parse(raw);
		if (typeof value !== 'object' || value === null) return null;
		const { type, message } = value as Record<string, unknown>;
		if ((type !== 'success' && type !== 'error') || typeof message !== 'string' || !message) {
			return null;
		}
		return { type, message: message.slice(0, MAX_MESSAGE_LENGTH) };
	} catch {
		return null;
	}
}
