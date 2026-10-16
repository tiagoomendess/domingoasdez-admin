/**
 * Rules of a coach's history (`team_agents_history`), as pure functions. The legacy site had
 * none, so the history filled up with repeated rows. Read in date order, the history may not have:
 * - two entries in a row with the same team and role (the second one changes nothing)
 * - two entries on the same day (which one came first is ambiguous)
 */

export type HistoryEntry = {
	/** `null` for an entry that is not saved yet. */
	id: number | null;
	teamId: number | null;
	agentType: string;
	startedAt: Date;
};

export type HistoryProblem = 'repeated' | 'same_day';

/** The calendar day of a `started_at` (stored as a naive UTC datetime). */
export const dayOf = (date: Date) => date.toISOString().slice(0, 10);

/** Same team (or both none) and same role. */
export const sameRole = (
	a: Pick<HistoryEntry, 'teamId' | 'agentType'>,
	b: Pick<HistoryEntry, 'teamId' | 'agentType'>
) => a.teamId === b.teamId && a.agentType === b.agentType;

/** Oldest first; unsaved entries after saved ones of the same moment. */
export function sortHistory<Entry extends HistoryEntry>(entries: Entry[]): Entry[] {
	return [...entries].sort(
		(a, b) =>
			a.startedAt.getTime() - b.startedAt.getTime() ||
			(a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER)
	);
}

/** The first problem of a history, with the entries involved; null when it is fine. */
export function findProblem(
	entries: HistoryEntry[]
): { problem: HistoryProblem; entries: [HistoryEntry, HistoryEntry] } | null {
	const sorted = sortHistory(entries);
	for (let i = 1; i < sorted.length; i++) {
		const [previous, entry] = [sorted[i - 1], sorted[i]];
		if (dayOf(previous.startedAt) === dayOf(entry.startedAt)) {
			return { problem: 'same_day', entries: [previous, entry] };
		}
		if (sameRole(previous, entry)) return { problem: 'repeated', entries: [previous, entry] };
	}
	return null;
}

/**
 * Problems an admin's change would add. Problems the history already had (legacy data) are not
 * blamed on an unrelated change: only pairs that involve the changed entry, or that the change
 * brings together (deleting the entry between two equal ones), count.
 */
export function changeProblem(
	before: HistoryEntry[],
	after: HistoryEntry[]
): HistoryProblem | null {
	const pairs = (entries: HistoryEntry[]) => {
		const sorted = sortHistory(entries);
		const result: { key: string; problem: HistoryProblem }[] = [];
		for (let i = 1; i < sorted.length; i++) {
			const [a, b] = [sorted[i - 1], sorted[i]];
			const key = `${a.id ?? 'new'}:${b.id ?? 'new'}`;
			if (dayOf(a.startedAt) === dayOf(b.startedAt)) result.push({ key, problem: 'same_day' });
			else if (sameRole(a, b)) result.push({ key, problem: 'repeated' });
		}
		return result;
	};
	const existing = new Set(pairs(before).map((pair) => `${pair.key}:${pair.problem}`));
	return pairs(after).find((pair) => !existing.has(`${pair.key}:${pair.problem}`))?.problem ?? null;
}

export type AutomaticEntry =
	| { kind: 'none' }
	| { kind: 'add' }
	/** The latest entry is from today: correct it instead of adding another one. */
	| { kind: 'update'; id: number }
	/** The corrected latest entry would repeat the one before it: remove it instead. */
	| { kind: 'delete'; id: number };

/**
 * Legacy: saving a coach with a new team or role adds a history entry starting now. Now that
 * entry is only added when it differs from the latest one, and a change made on the same day
 * as the latest entry (fixing a mistake) corrects that entry instead of adding another.
 */
export function automaticEntry(
	history: HistoryEntry[],
	current: Pick<HistoryEntry, 'teamId' | 'agentType'>,
	now = new Date()
): AutomaticEntry {
	const sorted = sortHistory(history);
	const latest = sorted.at(-1);
	if (!latest) return { kind: 'add' };
	if (sameRole(latest, current)) return { kind: 'none' };
	if (latest.id !== null && dayOf(latest.startedAt) === dayOf(now)) {
		const previous = sorted.at(-2);
		return previous && sameRole(previous, current)
			? { kind: 'delete', id: latest.id }
			: { kind: 'update', id: latest.id };
	}
	return { kind: 'add' };
}
