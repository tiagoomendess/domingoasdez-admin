import { describe, expect, it } from 'vitest';
import { isActive, navigation, visibleNavigation } from './navigation';

const hrefs = (groups: ReturnType<typeof visibleNavigation>) =>
	groups.flatMap((group) => group.items.map((item) => item.href));

describe('visibleNavigation', () => {
	it('shows everything to admins', () => {
		expect(hrefs(visibleNavigation(['admin']))).toEqual(hrefs(navigation));
	});

	it('shows only permitted entries and drops empty groups', () => {
		const groups = visibleNavigation(['dashboard', 'articles', 'goals']);
		expect(hrefs(groups)).toEqual(['/articles', '/goals']);
		expect(groups).toHaveLength(2);
	});

	it('uses unique links', () => {
		const all = hrefs(navigation);
		expect(new Set(all).size).toBe(all.length);
	});
});

describe('isActive', () => {
	it('matches the section and its sub-pages only', () => {
		expect(isActive('/games', '/games')).toBe(true);
		expect(isActive('/games/12/edit', '/games')).toBe(true);
		expect(isActive('/game-groups', '/games')).toBe(false);
		expect(isActive('/', '/')).toBe(true);
		expect(isActive('/games', '/')).toBe(false);
	});
});
