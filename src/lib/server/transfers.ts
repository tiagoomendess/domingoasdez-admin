import { and, asc, desc, eq, gt, lte } from 'drizzle-orm';
import type { Transaction } from '#lib/server/db/index.ts';
import { transfers } from '#lib/server/db/schema.ts';

type Neighbour = { teamId: number | null } | undefined;

/**
 * A transfer that repeats the team of the transfer just before or just after it (in date order)
 * shows up as "Carapeços → Carapeços" on the public site. Pure, for the tests.
 */
export const repeatsNeighbour = (teamId: number | null, before: Neighbour, after: Neighbour) =>
	(before !== undefined && before.teamId === teamId) ||
	(after !== undefined && after.teamId === teamId);

/**
 * Records that a player moved to `teamId` (null: no team) on `date`, unless it would repeat the
 * team of the transfer just before or after that date. The player's own `team_id` can be out of
 * sync with the transfers (the legacy site edits them separately), so comparing with it alone let
 * repeated transfers through. Returns the new row, or null when nothing was recorded.
 */
export async function recordTransfer(
	tx: Transaction,
	{ playerId, teamId, date }: { playerId: number; teamId: number | null; date: Date }
) {
	const [before] = await tx
		.select({ teamId: transfers.teamId })
		.from(transfers)
		.where(and(eq(transfers.playerId, playerId), lte(transfers.date, date)))
		.orderBy(desc(transfers.date), desc(transfers.id))
		.limit(1);
	const [after] = await tx
		.select({ teamId: transfers.teamId })
		.from(transfers)
		.where(and(eq(transfers.playerId, playerId), gt(transfers.date, date)))
		.orderBy(asc(transfers.date), asc(transfers.id))
		.limit(1);
	if (repeatsNeighbour(teamId, before, after)) return null;

	const [{ id }] = await tx
		.insert(transfers)
		.values({ playerId, teamId, date, visible: true })
		.$returningId();
	const [row] = await tx.select().from(transfers).where(eq(transfers.id, id));
	return row;
}
