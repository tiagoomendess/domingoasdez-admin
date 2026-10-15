import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { fromLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { slugify } from '#lib/slug.ts';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { pollAnswers, polls } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { createPollSchema, parseAnswers, updatePollSchema } from './form';
import { isSlugTaken, type Poll, type PollAnswer } from './index';

type DateField = 'publish_after' | 'close_after' | 'show_results_after';

/** Reads the submitted dates in the admin's timezone, like the legacy form's timezone select. */
function readDates(
	values: Partial<Record<DateField, string | null>>,
	timeZone: string,
	errors: FieldErrors
) {
	const dates: Partial<Record<DateField, Date>> = {};
	for (const field of ['publish_after', 'close_after', 'show_results_after'] as const) {
		const value = values[field];
		if (!value) continue;
		const date = fromLocalInput(value, timeZone);
		if (date) dates[field] = date;
		else errors[field] = [m.validation_date()];
	}
	return dates;
}

/** Legacy `PollController@store`: the slug, then `-2` … `-5`, then 4 random characters. */
async function uniqueSlug(base: string): Promise<string> {
	for (const slug of [base, ...[2, 3, 4, 5].map((n) => `${base}-${n}`)]) {
		if (!(await isSlugTaken(slug))) return slug;
	}
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const suffix = Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('');
	return `${base}-${suffix}`;
}

/**
 * Legacy `PollController@store`: the poll with its answers. The image is made later by the
 * legacy `ProcessPolls` job (`update_image`), which also publishes scheduled polls.
 */
export async function createPoll(formData: FormData, timeZone: string) {
	const form = parseForm(createPollSchema, formData);
	const { answers, errors } = parseAnswers(formData);
	if (!form.success) return { failure: invalid({ ...form.errors, ...errors }, form.values) };
	const { data, values } = form;

	const dates = readDates(data, timeZone, errors);
	const base = slugify(data.question);
	if (!base) errors.question = [m.polls_question_no_slug()];
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };
	const { publish_after, close_after, show_results_after } = dates as Record<DateField, Date>;

	const slug = await uniqueSlug(base);
	const saved = await db.transaction(async (tx) => {
		const [{ id }] = await tx
			.insert(polls)
			.values({
				question: data.question,
				slug,
				publishAfter: publish_after,
				closeAfter: close_after,
				showResultsAfter: show_results_after,
				updateImage: true,
				visible: publish_after < new Date()
			})
			.$returningId();
		await tx.insert(pollAnswers).values(answers.map((answer) => ({ pollId: id, answer })));
		const [poll] = await tx.select().from(polls).where(eq(polls.id, id));
		const answerRows = await tx.select().from(pollAnswers).where(eq(pollAnswers.pollId, id));
		return { poll, answers: answerRows };
	});

	await audit({ action: 'create', model: 'Poll', newValues: saved.poll });
	for (const answer of saved.answers) {
		await audit({ action: 'create', model: 'PollAnswer', newValues: answer });
	}
	return { poll: saved.poll };
}

/** The publish date can't change once the poll is out (see `updatePoll`). */
export const isPublished = (poll: Poll, now = new Date()) => poll.publishAfter <= now;

/**
 * Legacy `PollController@update`: question and dates; `visible` follows the publish date.
 * Fixed legacy bugs:
 * - a new question never set `update_image` (the question was assigned before the comparison),
 *   so the shared image kept the old text;
 * - the edit form disabled the publish date while the poll was still scheduled, so the browser
 *   left it out and the save always failed; it is now locked once the poll is published instead.
 */
export async function updatePoll(formData: FormData, existing: Poll, timeZone: string) {
	const form = parseForm(updatePollSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const locked = isPublished(existing);
	const errors: FieldErrors = {};
	if (!locked && !data.publish_after) errors.publish_after = [m.validation_required()];
	const dates = readDates(
		{ ...data, publish_after: locked ? null : data.publish_after },
		timeZone,
		errors
	);
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	const publishAfter = dates.publish_after ?? existing.publishAfter;
	const questionChanged = data.question !== existing.question;
	const changes = changedColumns(existing, {
		question: data.question,
		publishAfter,
		closeAfter: dates.close_after!,
		showResultsAfter: dates.show_results_after!,
		visible: publishAfter < new Date(),
		...(questionChanged ? { updateImage: true } : {})
	});
	if (!Object.keys(changes).length) return { poll: existing };

	await db.update(polls).set(changes).where(eq(polls.id, existing.id));
	const [poll] = await db.select().from(polls).where(eq(polls.id, existing.id));
	await audit({ action: 'update', model: 'Poll', oldValues: existing, newValues: poll });
	return { poll };
}

/**
 * Legacy `PollController@destroy`: the poll, its answers and their votes (the foreign keys
 * cascade). The generated image is kept, as on the legacy site.
 */
export async function deletePoll(poll: Poll) {
	const answers: PollAnswer[] = await db
		.select()
		.from(pollAnswers)
		.where(eq(pollAnswers.pollId, poll.id));
	await db.delete(polls).where(eq(polls.id, poll.id));

	for (const answer of answers) {
		await audit({ action: 'delete', model: 'PollAnswer', oldValues: answer });
	}
	await audit({ action: 'delete', model: 'Poll', oldValues: poll });
}
