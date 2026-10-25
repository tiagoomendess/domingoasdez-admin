import { and, eq, ne } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { players } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { logger } from '#lib/server/log.ts';
import { insertImageMedia, isInMediaLibrary } from '#lib/server/media-library.ts';
import { fetchPublicUrl } from '#lib/server/net.ts';
import { IMAGE_LIMITS } from '#lib/server/storage/images.ts';
import { deleteFile } from '#lib/server/storage/index.ts';
import {
	detectImageFormat,
	discardImage,
	readUploadedImage,
	storeImage,
	type ImageFormat,
	type StoredImage
} from '#lib/server/storage/uploads.ts';
import { teamExists } from '#lib/server/teams/index.ts';
import { recordTransfer } from '#lib/server/transfers.ts';
import { PICTURE_URL_MAX_BYTES, pictureTags, playerColumns, playerFormSchema } from './form';
import { isAssociationIdTaken, type Player } from './index';

const log = logger.child('players');

type Picture = { bytes: Uint8Array; format: ImageFormat };

/**
 * The square photo of a person (players, coaches): an upload (JPEG/PNG) or a link the server
 * downloads. Legacy: an uploaded file wins over a link (`Image::make($url)`).
 */
export async function readPictureInput(
	data: { picture: File | null; picture_url: string | null },
	errors: FieldErrors
): Promise<Picture | null> {
	if (data.picture) {
		const picture = await readUploadedImage(data.picture, ['jpeg', 'png'] as const);
		if (!picture) errors.picture = [m.validation_file_type({ types: 'JPEG, PNG' })];
		return picture;
	}
	if (!data.picture_url) return null;
	try {
		const { bytes } = await fetchPublicUrl(data.picture_url, { maxBytes: PICTURE_URL_MAX_BYTES });
		const format = await detectImageFormat(bytes);
		if (format === 'jpeg' || format === 'png' || format === 'webp') return { bytes, format };
		errors.picture_url = [m.players_picture_url_not_image()];
	} catch (error) {
		log.warn('picture link failed', error);
		errors.picture_url = [m.players_picture_url_failed()];
	}
	return null;
}

/** Legacy `Carbon::now()->format('Y-m-d')` (UTC) as the transfer date. */
function today(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Create (`existing` null) or update a player from the submitted form, with the legacy
 * `PlayerController` side effects:
 * - the name is saved in title case
 * - a picture (upload or link) is cropped square, stored and added to the media library
 * - a new team (or leaving one) records a transfer dated today, unless it would repeat the
 *   team of the neighbouring transfer ("Carapeços → Carapeços")
 * Fixed legacy bugs: a repeated association number failed in SQL (unique index), and a picture
 * added on edit got no media library thumbnail. A replaced picture is deleted only when nothing
 * else uses it. Returns the saved row, or the `fail()` the action must return.
 */
export async function savePlayer(formData: FormData, existing: Player | null, user: AdminUser) {
	const form = parseForm(playerFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	if (
		data.association_id &&
		data.association_id !== existing?.associationId &&
		(await isAssociationIdTaken(data.association_id, existing?.id))
	) {
		errors.association_id = [m.players_association_id_taken()];
	}
	if (data.team_id && data.team_id !== existing?.teamId && !(await teamExists(data.team_id))) {
		errors.team_id = [m.validation_not_found()];
	}
	const picture = await readPictureInput(data, errors);
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (picture) {
		try {
			stored = await storeImage(picture.bytes, picture.format, {
				resize: { fit: 'square', size: IMAGE_LIMITS.squareSize },
				thumbnail: true
			});
		} catch (error) {
			log.error('picture upload failed', error);
			const field = data.picture ? 'picture' : 'picture_url';
			return { failure: invalid({ [field]: [m.form_upload_failed()] }, values) };
		}
	}

	const columns = { ...playerColumns(data), ...(stored ? { picture: stored.url } : {}) };
	const teamChanged = existing ? existing.teamId !== columns.teamId : columns.teamId !== null;

	let saved: {
		player: Player;
		media: Record<string, unknown> | null;
		transfer: Record<string, unknown> | null;
	};
	try {
		saved = await db.transaction(async (tx) => {
			const media = stored
				? await insertImageMedia(tx, {
						userId: user.id,
						image: stored,
						tags: pictureTags(columns.name, columns.nickname)
					})
				: null;

			let id: number;
			if (existing) {
				id = existing.id;
				const changes = changedColumns(existing, columns);
				if (Object.keys(changes).length)
					await tx.update(players).set(changes).where(eq(players.id, id));
			} else {
				[{ id }] = await tx.insert(players).values(columns).$returningId();
			}

			const transfer = teamChanged
				? await recordTransfer(tx, { playerId: id, teamId: columns.teamId, date: today() })
				: null;

			const [player] = await tx.select().from(players).where(eq(players.id, id));
			return { player, media, transfer };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	if (saved.transfer) {
		await audit({ action: 'create', model: 'Transfer', newValues: saved.transfer });
	}
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Player',
		oldValues: existing,
		newValues: saved.player
	});

	if (stored && existing?.picture && existing.picture !== stored.url) {
		await deleteReplacedPicture(existing.picture, existing.id);
	}

	return { player: saved.player };
}

/**
 * Removes a replaced picture file, unless something still shows it: the media library (every
 * legacy upload has a `media` row) or another player.
 */
async function deleteReplacedPicture(url: string, playerId: number) {
	try {
		const [otherPlayer] = await db
			.select({ id: players.id })
			.from(players)
			.where(and(eq(players.picture, url), ne(players.id, playerId)))
			.limit(1);
		if (otherPlayer || (await isInMediaLibrary(db, url))) return;
		await deleteFile(url);
	} catch (error) {
		log.warn('could not clean up the replaced picture', error);
	}
}
