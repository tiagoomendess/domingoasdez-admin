import { and, eq } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { media, playerUpdateRequests, players } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { insertImageMedia } from '#lib/server/media-library.ts';
import { fileInUse, mediaUsage } from '#lib/server/media/index.ts';
import { deleteMedia } from '#lib/server/media/save.ts';
import { fetchPublicUrl } from '#lib/server/net.ts';
import { PICTURE_URL_MAX_BYTES, pictureTags } from '#lib/server/players/form.ts';
import { isAssociationIdTaken, type Player } from '#lib/server/players/index.ts';
import { IMAGE_LIMITS } from '#lib/server/storage/images.ts';
import { deleteFile } from '#lib/server/storage/index.ts';
import {
	detectImageFormat,
	discardImage,
	storeImage,
	type StoredImage
} from '#lib/server/storage/uploads.ts';
import { teamExists } from '#lib/server/teams/index.ts';
import { recordTransfer } from '#lib/server/transfers.ts';
import {
	approveSchema,
	compareRequest,
	denySchema,
	isNoClub,
	isPosition,
	type RequestField
} from './compare';
import { requestPlayer, requestValues, type UpdateRequest } from './index';

/** Thrown inside the transaction when another admin reviewed the request first. */
class AlreadyReviewed extends Error {}

const alreadyReviewed = (values: Record<string, string>) =>
	invalid({}, values, m.update_requests_already_reviewed());

/** Marks a pending request as reviewed; fails when it is no longer pending. */
async function closeRequest(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	request: UpdateRequest,
	changes: Partial<typeof playerUpdateRequests.$inferInsert>
) {
	const [result] = await tx
		.update(playerUpdateRequests)
		.set({ reviewedAt: new Date(), ...changes })
		.where(
			and(eq(playerUpdateRequests.id, request.id), eq(playerUpdateRequests.status, 'pending'))
		);
	if (result.affectedRows !== 1) throw new AlreadyReviewed();
}

/** Legacy `processPicture()`: downloads the link and stores it like a player photo. */
async function storeRequestPicture(url: string): Promise<StoredImage | 'invalid' | 'failed'> {
	try {
		const { bytes } = await fetchPublicUrl(url, { maxBytes: PICTURE_URL_MAX_BYTES });
		const format = await detectImageFormat(bytes);
		if (format !== 'jpeg' && format !== 'png' && format !== 'webp') return 'invalid';
		return await storeImage(bytes, format, {
			resize: { fit: 'square', size: IMAGE_LIMITS.squareSize },
			thumbnail: true
		});
	} catch (error) {
		console.warn('[update-requests] picture failed:', error);
		return 'failed';
	}
}

/**
 * Approves a pending request, applying only the fields the admin kept ticked (new: the legacy
 * site applied everything). With the legacy `approve()` side effects:
 * - a new player is created (visible), or the existing one updated
 * - the picture link is downloaded, cropped square and added to the media library
 * - a club change moves the player and records a transfer dated when the request was made
 *   (unless it would repeat the team of the neighbouring transfer)
 * Fixed legacy bugs: the request was marked approved before the player was saved, so a failure
 * (unknown club, broken picture link) left it approved with nothing applied; everything now
 * happens in one transaction. A repeated association number is a form error instead of SQL.
 * After approval the replaced picture is deleted, with its media library rows, unless something
 * else still shows the file.
 */
export async function approveRequest(formData: FormData, request: UpdateRequest, user: AdminUser) {
	const form = parseForm(approveSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;
	if (request.status !== 'pending') return { failure: alreadyReviewed(values) };

	const existing = await requestPlayer(request.playerId);
	if (request.playerId && !existing) {
		return { failure: invalid({}, values, m.update_requests_player_missing()) };
	}
	const creating = !existing;

	const rows = compareRequest(requestValues(request), existing?.values ?? null);
	const selected = new Set<RequestField>(
		rows.filter((row) => row.changed && data.fields.includes(row.field)).map((row) => row.field)
	);
	// A new player can't be created without a name.
	if (creating) selected.add('name');

	const errors: FieldErrors = {};
	if (creating && !request.name) errors.fields = [m.update_requests_name_missing()];
	if (
		selected.has('association_id') &&
		request.associationId &&
		(await isAssociationIdTaken(request.associationId, existing?.row.id))
	) {
		errors.fields = [m.players_association_id_taken()];
	}
	if (selected.has('position') && request.position && !isPosition(request.position)) {
		selected.delete('position');
	}

	let teamId: number | null = null;
	if (selected.has('club') && !isNoClub(request.clubName)) {
		if (!data.team_id) errors.team_id = [m.update_requests_team_required()];
		else if (!(await teamExists(data.team_id))) errors.team_id = [m.validation_not_found()];
		else teamId = data.team_id;
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (selected.has('picture') && request.pictureUrl) {
		const result = await storeRequestPicture(request.pictureUrl);
		if (result === 'invalid' || result === 'failed') {
			const message =
				result === 'invalid' ? m.players_picture_url_not_image() : m.players_picture_url_failed();
			return { failure: invalid({ picture: [message] }, values) };
		}
		stored = result;
	}

	const columns: Partial<typeof players.$inferInsert> = {};
	if (selected.has('name')) columns.name = request.name!;
	if (selected.has('nickname')) columns.nickname = request.nickname;
	if (selected.has('association_id')) columns.associationId = request.associationId;
	if (selected.has('phone')) columns.phone = request.phone;
	if (selected.has('email')) columns.email = request.email;
	if (selected.has('facebook_profile')) columns.facebookProfile = request.facebookProfile;
	if (selected.has('birth_date')) columns.birthDate = request.birthDate;
	if (selected.has('position') && request.position && isPosition(request.position)) {
		columns.position = request.position;
	}
	if (selected.has('obs')) columns.obs = request.obs;
	if (stored) columns.picture = stored.url;
	if (selected.has('club')) columns.teamId = teamId;

	let saved: {
		player: Player;
		request: UpdateRequest;
		media: Record<string, unknown> | null;
		transfer: Record<string, unknown> | null;
	};
	try {
		saved = await db.transaction(async (tx) => {
			let playerId: number;
			if (existing) {
				playerId = existing.row.id;
				const changes = changedColumns(existing.row, columns);
				if (Object.keys(changes).length) {
					await tx.update(players).set(changes).where(eq(players.id, playerId));
				}
			} else {
				[{ id: playerId }] = await tx
					.insert(players)
					.values({ position: 'none', visible: true, ...columns, name: request.name! })
					.$returningId();
			}

			await closeRequest(tx, request, {
				status: 'approved',
				reviewedBy: user.id,
				reviewNotes: data.review_notes,
				...(creating ? { playerId } : {})
			});

			const mediaRow = stored
				? await insertImageMedia(tx, {
						userId: user.id,
						image: stored,
						tags: pictureTags(columns.name ?? existing!.row.name, request.nickname)
					})
				: null;

			const transfer = selected.has('club')
				? await recordTransfer(tx, { playerId, teamId, date: request.createdAt ?? new Date() })
				: null;

			const [player] = await tx.select().from(players).where(eq(players.id, playerId));
			const [row] = await tx
				.select()
				.from(playerUpdateRequests)
				.where(eq(playerUpdateRequests.id, request.id));
			return { player, request: row, media: mediaRow, transfer };
		});
	} catch (error) {
		await discardImage(stored);
		if (error instanceof AlreadyReviewed) return { failure: alreadyReviewed(values) };
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	await audit({
		action: creating ? 'create' : 'update',
		model: 'Player',
		oldValues: existing?.row ?? null,
		newValues: saved.player
	});
	if (saved.transfer) {
		await audit({ action: 'create', model: 'Transfer', newValues: saved.transfer });
	}
	await audit({
		action: 'update',
		model: 'PlayerUpdateRequest',
		oldValues: request,
		newValues: saved.request,
		extraInfo: skippedInfo(rows, selected)
	});

	const oldPicture = existing?.row.picture;
	if (stored && oldPicture && oldPicture !== stored.url) await deleteOldPicture(oldPicture);

	return { player: saved.player, created: creating };
}

/** Audit note of the changes the admin chose not to apply. */
function skippedInfo(rows: ReturnType<typeof compareRequest>, selected: Set<RequestField>) {
	const skipped = rows.filter((row) => row.changed && !selected.has(row.field));
	return skipped.length
		? `Campos não aplicados: ${skipped.map((row) => row.field).join(', ')}`
		: null;
}

/**
 * Legacy `deleteOldPicture()`: removes the media library rows of the replaced photo and the file.
 * The file stays when something else still shows it (another player, an article, …).
 */
async function deleteOldPicture(url: string) {
	if (!url.startsWith('/storage/')) return;
	try {
		const items = await db.select().from(media).where(eq(media.url, url));
		for (const item of items) await deleteMedia(item);
		if (!items.length && fileInUse(await mediaUsage({ id: 0, url })) === 0) {
			await deleteFile(url);
		}
	} catch (error) {
		console.warn('[update-requests] could not delete the old picture:', error);
	}
}

/** Legacy `deny()`: the reason is required and nothing changes on the player. */
export async function denyRequest(formData: FormData, request: UpdateRequest, user: AdminUser) {
	const form = parseForm(denySchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	if (request.status !== 'pending') return { failure: alreadyReviewed(form.values) };

	let row: UpdateRequest;
	try {
		row = await db.transaction(async (tx) => {
			await closeRequest(tx, request, {
				status: 'denied',
				reviewedBy: user.id,
				reviewNotes: form.data.review_notes
			});
			const [updated] = await tx
				.select()
				.from(playerUpdateRequests)
				.where(eq(playerUpdateRequests.id, request.id));
			return updated;
		});
	} catch (error) {
		if (error instanceof AlreadyReviewed) return { failure: alreadyReviewed(form.values) };
		throw error;
	}
	await audit({
		action: 'update',
		model: 'PlayerUpdateRequest',
		oldValues: request,
		newValues: row
	});
	return { request: row };
}

export async function deleteRequest(request: UpdateRequest) {
	await db.delete(playerUpdateRequests).where(eq(playerUpdateRequests.id, request.id));
	await audit({ action: 'delete', model: 'PlayerUpdateRequest', oldValues: request });
}
