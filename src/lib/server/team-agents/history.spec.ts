import { describe, expect, it } from 'vitest';
import { automaticEntry, changeProblem, findProblem, type HistoryEntry } from './history';

const day = (date: string) => new Date(`${date}T00:00:00Z`);
const entry = (id: number | null, teamId: number | null, date: string, agentType = 'manager') => ({
	id,
	teamId,
	agentType,
	startedAt: day(date)
});

const history: HistoryEntry[] = [
	entry(1, 10, '2020-09-01'),
	entry(2, 20, '2021-09-01'),
	entry(3, 10, '2022-09-01')
];

describe('findProblem', () => {
	it('accepts a history that changes at every entry', () => {
		expect(findProblem(history)).toBeNull();
	});

	it('finds the same team and role twice in a row, in date order', () => {
		const found = findProblem([...history, entry(4, 10, '2023-01-01')]);
		expect(found?.problem).toBe('repeated');
		expect(found?.entries.map((row) => row.id)).toEqual([3, 4]);
	});

	it('finds two entries on the same day', () => {
		expect(findProblem([...history, entry(4, 30, '2022-09-01')])?.problem).toBe('same_day');
	});

	it('treats a new role in the same team as a change', () => {
		expect(findProblem([...history, entry(4, 10, '2023-01-01', 'director')])).toBeNull();
	});
});

describe('changeProblem', () => {
	it('refuses adding the same team and role right after the latest entry', () => {
		expect(changeProblem(history, [...history, entry(null, 10, '2023-01-01')])).toBe('repeated');
	});

	it('refuses adding an entry between two that would repeat it', () => {
		expect(changeProblem(history, [...history, entry(null, 20, '2021-12-01')])).toBe('repeated');
	});

	it('allows the same team again after another one', () => {
		expect(changeProblem(history, [...history, entry(null, 20, '2023-01-01')])).toBeNull();
	});

	it('refuses an edit that makes an entry equal to its neighbour', () => {
		const after = history.map((row) => (row.id === 2 ? { ...row, teamId: 10 } : row));
		expect(changeProblem(history, after)).toBe('repeated');
	});

	it('refuses an edit that moves an entry onto another one’s day', () => {
		const after = history.map((row) =>
			row.id === 3 ? { ...row, startedAt: day('2021-09-01') } : row
		);
		expect(changeProblem(history, after)).toBe('same_day');
	});

	it('refuses deleting the entry between two equal ones', () => {
		expect(
			changeProblem(
				history,
				history.filter((row) => row.id !== 2)
			)
		).toBe('repeated');
		expect(
			changeProblem(
				history,
				history.filter((row) => row.id !== 3)
			)
		).toBeNull();
	});

	it('does not blame an unrelated change for problems already there (legacy data)', () => {
		const legacy = [...history, entry(4, 10, '2023-01-01')];
		expect(changeProblem(legacy, [...legacy, entry(null, 30, '2024-01-01')])).toBeNull();
	});
});

describe('automaticEntry', () => {
	const now = new Date('2026-10-16T15:00:00Z');

	it('starts the history of a new coach', () => {
		expect(automaticEntry([], { teamId: 10, agentType: 'manager' }, now)).toEqual({ kind: 'add' });
	});

	it('adds nothing when the latest entry already says it', () => {
		expect(automaticEntry(history, { teamId: 10, agentType: 'manager' }, now)).toEqual({
			kind: 'none'
		});
	});

	it('adds an entry for a new team', () => {
		expect(automaticEntry(history, { teamId: 30, agentType: 'manager' }, now)).toEqual({
			kind: 'add'
		});
	});

	it('corrects an entry made today instead of adding another', () => {
		const withToday = [...history, entry(4, 30, '2026-10-16')];
		expect(automaticEntry(withToday, { teamId: 40, agentType: 'manager' }, now)).toEqual({
			kind: 'update',
			id: 4
		});
	});

	it('removes today’s entry when the correction undoes it', () => {
		const withToday = [...history, entry(4, 30, '2026-10-16')];
		expect(automaticEntry(withToday, { teamId: 10, agentType: 'manager' }, now)).toEqual({
			kind: 'delete',
			id: 4
		});
	});
});
