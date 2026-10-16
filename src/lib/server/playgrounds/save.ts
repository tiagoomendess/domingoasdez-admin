import { eq } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { clubExists } from '#lib/server/clubs/index.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { playgrounds } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { insertImageMedia } from '#lib/server/media-library.ts';
import { deleteFileIfUnused } from '#lib/server/media/index.ts';
import { storeUploadedPicture } from '#lib/server/pictures.ts';
import { discardImage, type StoredImage } from '#lib/server/storage/uploads.ts';
import { locationOf, pictureTags, playgroundColumns, playgroundFormSchema } from './form';
import { playgroundGameCount, type Playground } from './index';

/** Same point (to the 7th decimal, ~1 cm): the map round-trips coordinates as text. */
const sameLocation = (a: Playground['location'], b: Playground['location']) =>
	a === b ||
	(a !== null &&
		b !== null &&
		a.lat.toFixed(7) === b.lat.toFixed(7) &&
		a.lng.toFixed(7) === b.lng.toFixed(7));

/**
 * Create (`existing` null) or update a playground (legacy `PlaygroundController`): the optional
 * picture is a content image added to the media library; the location is `POINT(lat lng)`.
 * Fixed legacy bugs: playgrounds were never audited, the location could only be set on edit,
 * and a replaced picture was never deleted (now it is, when nothing else uses it).
 */
export async function savePlayground(
	formData: FormData,
	existing: Playground | null,
	user: AdminUser
) {
	const form = parseForm(playgroundFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	const location = locationOf(data, errors);
	if (data.club_id && data.club_id !== existing?.clubId && !(await clubExists(data.club_id))) {
		errors.club_id = [m.validation_not_found()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (data.picture) {
		const result = await storeUploadedPicture(data.picture, ['jpeg', 'png'], 'JPEG, PNG');
		if ('error' in result) return { failure: invalid({ picture: [result.error] }, values) };
		stored = result.stored;
	}

	const columns = { ...playgroundColumns(data), ...(stored ? { picture: stored.url } : {}) };
	const changes = existing
		? {
				...changedColumns(existing, columns),
				...(sameLocation(existing.location, location) ? {} : { location })
			}
		: null;
	if (existing && changes && !Object.keys(changes).length) return { playground: existing };
	let saved: { playground: Playground; media: Record<string, unknown> | null };
	try {
		saved = await db.transaction(async (tx) => {
			const media = stored
				? await insertImageMedia(tx, {
						userId: user.id,
						image: stored,
						tags: pictureTags(data.name)
					})
				: null;
			let id: number;
			if (existing && changes) {
				id = existing.id;
				await tx.update(playgrounds).set(changes).where(eq(playgrounds.id, id));
			} else {
				[{ id }] = await tx
					.insert(playgrounds)
					.values({ ...columns, location })
					.$returningId();
			}
			const [playground] = await tx.select().from(playgrounds).where(eq(playgrounds.id, id));
			return { playground, media };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Playground',
		oldValues: existing,
		newValues: saved.playground
	});
	if (stored && existing?.picture !== stored.url) await deleteFileIfUnused(existing?.picture);
	return { playground: saved.playground };
}

/**
 * Legacy `destroy` let the foreign key delete every game played there. Now a playground with
 * games can't be deleted (like competitions, seasons and groups). The picture stays in the media
 * library.
 */
export async function deletePlayground(playground: Playground) {
	const games = await playgroundGameCount(playground.id);
	if (games > 0) return { message: m.playgrounds_delete_has_games({ count: games }) };
	await db.delete(playgrounds).where(eq(playgrounds.id, playground.id));
	await audit({ action: 'delete', model: 'Playground', oldValues: playground });
	return { ok: true };
}
