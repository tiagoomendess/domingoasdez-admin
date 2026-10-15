import { describe, expect, it } from 'vitest';
import { can } from './permissions';

describe('can', () => {
	it('matches permission names exactly', () => {
		expect(can(['articles', 'dashboard'], 'articles')).toBe(true);
		expect(can(['articles'], 'articles.edit')).toBe(false);
		expect(can(new Set(['games.edit']), 'games')).toBe(false);
	});

	it('lets admin do everything', () => {
		expect(can(['admin'], 'users.edit')).toBe(true);
		expect(can(new Set(['admin']), 'dashboard')).toBe(true);
	});

	it('denies everything without permissions', () => {
		expect(can([], 'dashboard')).toBe(false);
	});
});
