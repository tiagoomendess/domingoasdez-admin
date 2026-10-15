/**
 * Only same-origin, absolute paths are allowed after login (`/games?page=2`), never
 * `//evil.example` or `/\evil.example`, which browsers treat as other origins.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
		return fallback;
	}
	try {
		const url = new URL(value, 'http://localhost');
		if (url.origin !== 'http://localhost') return fallback;
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return fallback;
	}
}

export function loginUrl(redirectTo: string) {
	const target = safeRedirectPath(redirectTo, '/');
	return target === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(target)}`;
}
