import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { fromLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { gameComments } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { findGame } from '#lib/server/games/index.ts';
import { commentFormSchema, newCommentSchema, newPin, plainText } from './form';
import { commentExists, type GameComment } from './index';

const readDeadline = (value: string, timeZone: string, errors: FieldErrors) => {
	const deadline = fromLocalInput(value, timeZone);
	if (!deadline) errors.deadline = [m.validation_date()];
	return deadline;
};

/**
 * New: the legacy admin only listed flash interviews (the `GenerateGameComments` job creates
 * them after each game). Creates one by hand, like the job: a new link (uuid) and 4-digit PIN for
 * one side of the game. No email is sent; the admin shares the link.
 */
export async function createComment(formData: FormData, timeZone: string) {
	const form = parseForm(newCommentSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	const game = await findGame(data.game_id);
	if (!game) errors.game_id = [m.validation_not_found()];
	const deadline = readDeadline(data.deadline, timeZone, errors);
	const teamId = game ? (data.side === 'home' ? game.homeTeamId : game.awayTeamId) : 0;
	if (game && (await commentExists(game.id, teamId))) errors.side = [m.game_comments_exists()];
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	const [{ id }] = await db
		.insert(gameComments)
		.values({
			uuid: randomUUID(),
			pin: newPin(),
			gameId: data.game_id,
			teamId,
			content: plainText(data.content),
			deadline: deadline!
		})
		.$returningId();
	const [row] = await db.select().from(gameComments).where(eq(gameComments.id, id));
	await audit({ action: 'create', model: 'GameComment', newValues: row });
	return { comment: row };
}

/** New: edit the comment (stored as plain text, like the public form) and the deadline. */
export async function updateComment(formData: FormData, existing: GameComment, timeZone: string) {
	const form = parseForm(commentFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const errors: FieldErrors = {};
	const deadline = readDeadline(form.data.deadline, timeZone, errors);
	if (Object.keys(errors).length) return { failure: invalid(errors, form.values) };

	const changes = changedColumns(existing, {
		content: plainText(form.data.content),
		deadline: deadline!
	});
	if (!Object.keys(changes).length) return { comment: existing };
	await db.update(gameComments).set(changes).where(eq(gameComments.id, existing.id));
	const [row] = await db.select().from(gameComments).where(eq(gameComments.id, existing.id));
	await audit({ action: 'update', model: 'GameComment', oldValues: existing, newValues: row });
	return { comment: row };
}

export async function deleteComment(comment: GameComment) {
	await db.delete(gameComments).where(eq(gameComments.id, comment.id));
	await audit({ action: 'delete', model: 'GameComment', oldValues: comment });
}
