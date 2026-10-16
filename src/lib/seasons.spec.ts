import { describe, expect, it } from 'vitest';
import { seasonLabel, seasonYears } from './seasons';

describe('season labels', () => {
	it('shows one year when the season fits in it (legacy getName)', () => {
		expect(seasonYears(2025, 2026)).toBe('2025/2026');
		expect(seasonYears(2026, 2026)).toBe('2026');
	});

	it('adds the display name when there is one', () => {
		expect(seasonLabel({ name: null, startYear: 2025, endYear: 2026 })).toBe('2025/2026');
		expect(seasonLabel({ name: 'Taça', startYear: 2026, endYear: 2026 })).toBe('Taça (2026)');
	});
});
