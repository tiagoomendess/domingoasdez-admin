import { and, isNull, lt, or } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { placardEvents, placards } from '#lib/server/db/schema.ts';
import type { JobContext } from '../job.ts';
import { cutoffs } from './cleanup-placards.rules.ts';

/**
 * New (no legacy job): stadium screens of domingoasdez-app not seen for 30 days are deleted with
 * their events, and older events of the others are pruned after 180 days. A TV whose screen was
 * deleted just gets a new one, with a new pairing code, the next time it opens /placard.
 */
export async function run({ log }: JobContext) {
	const { screens, events } = cutoffs(new Date());
	const [deletedScreens] = await db
		.delete(placards)
		.where(
			or(
				lt(placards.lastSeenAt, screens),
				and(isNull(placards.lastSeenAt), lt(placards.createdAt, screens))
			)
		);
	const [deletedEvents] = await db.delete(placardEvents).where(lt(placardEvents.createdAt, events));
	if (deletedScreens.affectedRows > 0 || deletedEvents.affectedRows > 0) {
		log.info(
			`deleted ${deletedScreens.affectedRows} screen(s) and ${deletedEvents.affectedRows} old event(s)`
		);
	}
}
