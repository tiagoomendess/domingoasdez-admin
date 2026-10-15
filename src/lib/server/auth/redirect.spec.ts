import { describe, expect, it } from 'vitest';
import { loginUrl, safeRedirectPath } from './redirect';

describe('safeRedirectPath', () => {
	it('keeps same-origin paths with query and hash', () => {
		expect(safeRedirectPath('/games?page=2#top')).toBe('/games?page=2#top');
	});

	it.each([
		null,
		undefined,
		'',
		'games',
		'//evil.example',
		'/\\evil.example',
		'https://evil.example/x',
		'javascript:alert(1)'
	])('falls back for %s', (value) => {
		expect(safeRedirectPath(value)).toBe('/');
		expect(safeRedirectPath(value, '/login')).toBe('/login');
	});
});

describe('loginUrl', () => {
	it('carries the page to return to', () => {
		expect(loginUrl('/players?q=silva')).toBe('/login?redirectTo=%2Fplayers%3Fq%3Dsilva');
		expect(loginUrl('/')).toBe('/login');
		expect(loginUrl('//evil.example')).toBe('/login');
	});
});
