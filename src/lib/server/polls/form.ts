import { z } from 'zod';
import { isLocalDateTime } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import type { FieldErrors } from '#lib/server/forms.ts';
import { localizeIssue, optional, required, requiredText } from '#lib/server/validation.ts';

export const QUESTION_MAX = 144;
export const ANSWER_MAX = 144;
export const MIN_ANSWERS = 2;
export const MAX_ANSWERS = 40;

/** `<input type="datetime-local">`, read in the admin's timezone by the action. */
const localDateTime = z.string().refine(isLocalDateTime, { error: () => m.validation_date() });

/** Answer inputs are `answer_1` … `answer_N`, so each one keeps its value and errors. */
const ANSWER_FIELD = /^answer_(\d+)$/;
const answerText = requiredText(ANSWER_MAX);

/**
 * Legacy `answers` rules (`array|min:2|max:40`, each `required|string|max:144`). Errors go to
 * the answer's own field, or to `answers` for the count.
 */
export function parseAnswers(formData: FormData): { answers: string[]; errors: FieldErrors } {
	const fields = [...formData.entries()]
		.map(([name, value]) => ({ index: Number(ANSWER_FIELD.exec(name)?.[1]), name, value }))
		.filter((field) => Number.isInteger(field.index))
		.sort((a, b) => a.index - b.index);

	const answers: string[] = [];
	const errors: FieldErrors = {};
	for (const field of fields) {
		const result = answerText.safeParse(field.value, { error: localizeIssue });
		if (result.success) answers.push(result.data);
		else errors[field.name] = result.error.issues.map((issue) => issue.message);
	}
	if (fields.length < MIN_ANSWERS) errors.answers = [m.polls_answers_min({ min: MIN_ANSWERS })];
	if (fields.length > MAX_ANSWERS) errors.answers = [m.polls_answers_max({ max: MAX_ANSWERS })];
	return { answers, errors };
}

/** Same rules as the legacy `PollController@store`. */
export const createPollSchema = z.object({
	question: requiredText(QUESTION_MAX),
	publish_after: required(localDateTime),
	close_after: required(localDateTime),
	show_results_after: required(localDateTime)
});

/**
 * `PollController@update`: the answers can't change once created (votes point at them). The
 * publish date is not sent once the poll is published (see `updatePoll`).
 */
export const updatePollSchema = z.object({
	question: requiredText(QUESTION_MAX),
	publish_after: optional(localDateTime),
	close_after: required(localDateTime),
	show_results_after: required(localDateTime)
});

export type PollStatus = 'scheduled' | 'open' | 'closed';

/** Where a poll is in its life, from its dates (the legacy job publishes scheduled polls). */
export function pollStatus(
	poll: { publishAfter: Date; closeAfter: Date },
	now = new Date()
): PollStatus {
	if (poll.publishAfter > now) return 'scheduled';
	if (poll.closeAfter <= now) return 'closed';
	return 'open';
}
