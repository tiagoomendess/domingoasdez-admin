/**
 * Light / dark mode. The choice lives in a `theme` cookie so the server can render the right
 * class; without the cookie the OS preference wins. The inline script in `src/app.html` applies
 * it before first paint — keep the two in sync.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const COOKIE = 'theme';
const ONE_YEAR = 60 * 60 * 24 * 365;

export function getThemePreference(): ThemePreference {
	const match = document.cookie.match(/(?:^|; )theme=(light|dark)/);
	return match ? (match[1] as 'light' | 'dark') : 'system';
}

export function isDark() {
	return document.documentElement.classList.contains('dark');
}

export function setThemePreference(preference: ThemePreference) {
	document.cookie =
		preference === 'system'
			? `${COOKIE}=; path=/; max-age=0; samesite=lax`
			: `${COOKIE}=${preference}; path=/; max-age=${ONE_YEAR}; samesite=lax`;

	const dark =
		preference === 'dark' ||
		(preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.classList.toggle('dark', dark);
	document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function toggleTheme(): ThemePreference {
	const next = isDark() ? 'light' : 'dark';
	setThemePreference(next);
	return next;
}
