/**
 * Process-local login throttle, like Laravel's ThrottlesLogins (5 attempts per minute per
 * email + IP). Fine for a single PM2 instance; move to the database or Redis if the admin is
 * ever scaled horizontally.
 */
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, number[]>();

function recent(key: string, now: number) {
	const list = (attempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
	if (list.length === 0) attempts.delete(key);
	else attempts.set(key, list);
	return list;
}

export function throttleKey(email: string, ip: string) {
	return `${email.trim().toLowerCase()}|${ip}`;
}

export function isLoginThrottled(key: string, now = Date.now()) {
	return recent(key, now).length >= MAX_ATTEMPTS;
}

export function recordLoginFailure(key: string, now = Date.now()) {
	attempts.set(key, [...recent(key, now), now]);
}

export function clearLoginFailures(key: string) {
	attempts.delete(key);
}
