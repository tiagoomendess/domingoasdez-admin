/**
 * A player's transfers read in date order are the player's history: each one must change the
 * team (or leave/join "no team"). These pure rules check a change against that.
 */

export type TimelineEntry = {
	/** `null` for a transfer that is not saved yet. */
	id: number | null;
	teamId: number | null;
	date: Date;
};

/** Oldest first; on the same date, in the order they were added (unsaved last). */
export function sortTimeline<Entry extends TimelineEntry>(entries: Entry[]): Entry[] {
	return [...entries].sort(
		(a, b) =>
			a.date.getTime() - b.date.getTime() ||
			(a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER)
	);
}

const repeatedPairs = (entries: TimelineEntry[]) => {
	const sorted = sortTimeline(entries);
	const pairs = new Set<string>();
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i - 1].teamId === sorted[i].teamId) {
			pairs.add(`${sorted[i - 1].id ?? 'new'}:${sorted[i].id ?? 'new'}`);
		}
	}
	return pairs;
};

/**
 * True when the change puts two transfers with the same team next to each other. Repeats the
 * history already had (legacy data) don't count against an unrelated change: only pairs the
 * change creates do (a new or moved transfer next to an equal one, or a delete bringing two
 * equal ones together).
 */
export function createsRepeat(before: TimelineEntry[], after: TimelineEntry[]): boolean {
	const existing = repeatedPairs(before);
	return [...repeatedPairs(after)].some((pair) => !existing.has(pair));
}

/** The most recent transfer: it decides the player's current team. */
export const latestOf = <Entry extends TimelineEntry>(entries: Entry[]): Entry | undefined =>
	sortTimeline(entries).at(-1);

/**
 * The team to set on the player after a change, or `undefined` when the player must not be
 * touched: only a change to the most recent transfer (adding a newer one, editing or deleting the
 * latest) moves the player. Old history rows leave the player alone.
 */
export function playerTeamAfter(
	before: TimelineEntry[],
	after: TimelineEntry[]
): number | null | undefined {
	const was = latestOf(before);
	const now = latestOf(after);
	if (!now) return undefined;
	if (was && was.id === now.id && was.id !== null && was.teamId === now.teamId) return undefined;
	return now.teamId;
}
