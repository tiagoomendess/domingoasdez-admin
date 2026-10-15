import { asc, count, eq, like, or, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { pollAnswers, pollAnswerVotes, polls } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { pollStatus } from './form';

export type Poll = typeof polls.$inferSelect;
export type PollAnswer = typeof pollAnswers.$inferSelect;

export const POLL_SORTS = ['id', 'question', 'publish_after', 'close_after'] as const;

/** Legacy `Poll::getImage()`: the generated image, or the default one until the job makes it. */
export const pollImage = (image: string | null) => mediaUrl(image || '/images/poll_default.png');

/** Question or slug, or the id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const text = or(like(polls.question, pattern), like(polls.slug, pattern));
	const id = searchId(q);
	return id ? or(eq(polls.id, id), text) : text;
}

export async function listPolls(url: URL) {
	const params = parseListParams(url, POLL_SORTS, { sort: 'id', dir: 'desc' });
	const where = searchWhere(params.q);
	const state = listState(params, await db.$count(polls, where));

	const sortColumn = {
		id: polls.id,
		question: polls.question,
		publish_after: polls.publishAfter,
		close_after: polls.closeAfter
	}[params.sort];

	const rows = await db
		.select({
			id: polls.id,
			question: polls.question,
			slug: polls.slug,
			image: polls.image,
			publishAfter: polls.publishAfter,
			closeAfter: polls.closeAfter,
			answers: db.$count(pollAnswers, eq(pollAnswers.pollId, polls.id))
		})
		.from(polls)
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(polls.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	const now = new Date();
	return {
		rows: rows.map((row) => ({
			...row,
			image: pollImage(row.image),
			status: pollStatus(row, now)
		})),
		list: state
	};
}

export async function findPoll(id: number): Promise<Poll | undefined> {
	const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
	return poll;
}

/** The answers in creation order, with their vote count. */
export async function pollResults(pollId: number) {
	return db
		.select({ id: pollAnswers.id, answer: pollAnswers.answer, votes: count(pollAnswerVotes.id) })
		.from(pollAnswers)
		.leftJoin(pollAnswerVotes, eq(pollAnswerVotes.pollAnswerId, pollAnswers.id))
		.where(eq(pollAnswers.pollId, pollId))
		.groupBy(pollAnswers.id, pollAnswers.answer)
		.orderBy(asc(pollAnswers.id));
}

export async function isSlugTaken(slug: string): Promise<boolean> {
	const [row] = await db.select({ id: polls.id }).from(polls).where(eq(polls.slug, slug)).limit(1);
	return Boolean(row);
}
