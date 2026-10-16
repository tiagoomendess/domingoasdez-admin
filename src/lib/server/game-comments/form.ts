import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { isLocalDateTime } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { optional, required, requiredId } from '#lib/server/validation.ts';

/** The public form's limit (`content: max:1000`). */
export const CONTENT_MAX = 1000;

const localDateTime = z.string().refine(isLocalDateTime, { error: () => m.validation_date() });

/** Edit: the comment (moderation, or on the club's behalf) and the deadline. */
export const commentFormSchema = z.object({
	content: optional(z.string().max(CONTENT_MAX)),
	deadline: required(localDateTime)
});

/** New: which game, which side, and until when the club can answer. */
export const newCommentSchema = commentFormSchema.extend({
	game_id: requiredId(),
	side: z.enum(['home', 'away'])
});

/** Legacy public form: the text is stored without HTML (`strip_tags`). */
export const plainText = (value: string | null) => (value ?? '').replace(/<[^>]*>/g, '').trim();

/** Legacy `generateRandomPinNumber(4)`. */
export const newPin = () => Array.from({ length: 4 }, () => randomInt(10)).join('');

export type CommentStatus = 'waiting' | 'answered' | 'expired' | 'used';

/** Where a flash interview is: the legacy job marks `used` once it is in a generated article. */
export function commentStatus(
	row: { content: string; deadline: Date; used: boolean },
	now = new Date()
): CommentStatus {
	if (row.used) return 'used';
	if (row.content.trim()) return 'answered';
	return row.deadline > now ? 'waiting' : 'expired';
}
