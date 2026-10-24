import { and, asc, eq, gt, lt, ne, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { polls } from '#lib/server/db/schema.ts';
import { deleteFile, STORAGE_FOLDERS, storeFile } from '#lib/server/storage/index.ts';
import type { JobContext } from '../job.ts';
import { renderPollImage } from '../images/poll.ts';

/** Polls drawn per run (legacy `limit(10)`). */
const POLLS_PER_RUN = 10;

/**
 * Hidden polls whose publication time has come (and that aren't closed yet) become visible.
 * Like legacy's query-builder update, `updated_at` is left as it is.
 */
async function publishScheduled(now: Date) {
	const [result] = await db
		.update(polls)
		.set({ visible: true, updatedAt: sql`${polls.updatedAt}` })
		.where(and(eq(polls.visible, false), lt(polls.publishAfter, now), gt(polls.closeAfter, now)));
	return result.affectedRows;
}

/**
 * Legacy `ProcessPolls`: publishes the scheduled polls, then draws the image of the polls flagged
 * `update_image` (the admin sets it when the question changes). The new file replaces
 * `polls.image` and the old one is deleted when no other poll uses it; a poll that fails keeps its
 * flag and is tried again next minute, as in legacy.
 */
export async function run({ log, signal }: JobContext) {
	const published = await publishScheduled(new Date());
	if (published > 0) log.info(`published ${published} scheduled poll(s)`);

	const pending = await db
		.select({ id: polls.id, question: polls.question, image: polls.image })
		.from(polls)
		.where(eq(polls.updateImage, true))
		.orderBy(asc(polls.id))
		.limit(POLLS_PER_RUN);

	for (const poll of pending) {
		if (signal.aborted) return;
		try {
			const jpeg = await renderPollImage(poll.question);
			const url = await storeFile(STORAGE_FOLDERS.pollImages, jpeg, 'jpg', 'image/jpeg');
			await db.update(polls).set({ image: url, updateImage: false }).where(eq(polls.id, poll.id));

			if (poll.image) {
				const [shared] = await db
					.select({ id: polls.id })
					.from(polls)
					.where(and(eq(polls.image, poll.image), ne(polls.id, poll.id)))
					.limit(1);
				if (!shared) await deleteFile(poll.image);
			}
			log.info(`image for poll #${poll.id}: ${url}`);
		} catch (error) {
			log.error(`poll #${poll.id}: could not draw the image`, error);
		}
	}
}
