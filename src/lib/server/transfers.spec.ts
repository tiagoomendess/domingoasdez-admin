import { describe, expect, it } from 'vitest';
import { repeatsNeighbour } from './transfers';

describe('repeatsNeighbour', () => {
	it('refuses the team of the transfer just before', () => {
		expect(repeatsNeighbour(5, { teamId: 5 }, undefined)).toBe(true);
	});

	it('refuses the team of the transfer just after (a back-dated transfer)', () => {
		expect(repeatsNeighbour(5, { teamId: 3 }, { teamId: 5 })).toBe(true);
	});

	it('treats "no team" twice in a row as a repeat', () => {
		expect(repeatsNeighbour(null, { teamId: null }, undefined)).toBe(true);
	});

	it('allows a real move, and the first transfer', () => {
		expect(repeatsNeighbour(5, { teamId: 3 }, { teamId: 7 })).toBe(false);
		expect(repeatsNeighbour(5, undefined, undefined)).toBe(false);
	});
});
