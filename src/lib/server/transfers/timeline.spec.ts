import { describe, expect, it } from 'vitest';
import { createsRepeat, playerTeamAfter, type TimelineEntry } from './timeline';

const at = (date: string) => new Date(`${date}T00:00:00Z`);
const entry = (id: number | null, teamId: number | null, date: string): TimelineEntry => ({
	id,
	teamId,
	date: at(date)
});

// A → B → none
const history = [
	entry(1, 10, '2020-08-01'),
	entry(2, 20, '2022-08-01'),
	entry(3, null, '2024-08-01')
];

describe('createsRepeat', () => {
	it('refuses a new transfer to the team the player is already in', () => {
		expect(createsRepeat(history, [...history, entry(null, null, '2025-08-01')])).toBe(true);
		expect(createsRepeat(history, [...history, entry(null, 30, '2025-08-01')])).toBe(false);
	});

	it('refuses an old row that repeats the transfer before or after it', () => {
		expect(createsRepeat(history, [...history, entry(null, 10, '2021-01-01')])).toBe(true);
		expect(createsRepeat(history, [...history, entry(null, 20, '2021-01-01')])).toBe(true);
		expect(createsRepeat(history, [...history, entry(null, 30, '2021-01-01')])).toBe(false);
	});

	it('refuses a delete that brings two equal transfers together', () => {
		const loop = [
			entry(1, 10, '2020-08-01'),
			entry(2, 20, '2022-08-01'),
			entry(3, 10, '2024-08-01')
		];
		expect(
			createsRepeat(
				loop,
				loop.filter((row) => row.id !== 2)
			)
		).toBe(true);
		expect(
			createsRepeat(
				loop,
				loop.filter((row) => row.id !== 3)
			)
		).toBe(false);
	});

	it('refuses an edit that moves a transfer next to an equal one', () => {
		const after = history.map((row) => (row.id === 3 ? { ...row, teamId: 20 } : row));
		expect(createsRepeat(history, after)).toBe(true);
	});

	it('ignores repeats the history already had (legacy data)', () => {
		const legacy = [entry(1, 10, '2020-08-01'), entry(2, 10, '2021-08-01')];
		expect(createsRepeat(legacy, [...legacy, entry(null, 30, '2022-08-01')])).toBe(false);
	});
});

describe('playerTeamAfter', () => {
	it('moves the player to a new latest transfer', () => {
		expect(playerTeamAfter(history, [...history, entry(4, 30, '2025-08-01')])).toBe(30);
	});

	it('leaves the player alone for old history rows', () => {
		expect(playerTeamAfter(history, [...history, entry(4, 30, '2019-08-01')])).toBeUndefined();
	});

	it('follows an edit or delete of the latest transfer', () => {
		expect(
			playerTeamAfter(
				history,
				history.map((row) => (row.id === 3 ? { ...row, teamId: 40 } : row))
			)
		).toBe(40);
		expect(
			playerTeamAfter(
				history,
				history.filter((row) => row.id !== 3)
			)
		).toBe(20);
		expect(
			playerTeamAfter(
				history,
				history.filter((row) => row.id !== 1)
			)
		).toBeUndefined();
	});

	it('does not touch a player whose last transfer is deleted', () => {
		const one = [entry(1, 10, '2020-08-01')];
		expect(playerTeamAfter(one, [])).toBeUndefined();
	});
});
