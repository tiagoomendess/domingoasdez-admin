import { and, eq, ne } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { insertImageMedia, isInMediaLibrary } from '#lib/server/media-library.ts';
import { deleteFile } from '#lib/server/storage/index.ts';
import { IMAGE_LIMITS } from '#lib/server/storage/images.ts';
import {
	detectImageFormat,
	discardImage,
	storeImage,
	type StoredImage
} from '#lib/server/storage/uploads.ts';
import { userExists } from '#lib/server/users.ts';
import { clubColumns, clubFormSchema, emblemTags } from './form';
import { isClubNameTaken, type Club } from './index';

/**
 * Create (`existing` null) or update a club from the submitted form, with the legacy
 * `ClubController` side effects: the emblem is stored as an 800 px square (PNG only when it uses
 * transparency) and added to the media library with a thumbnail. Returns the saved row, or the
 * `fail()` the action must return.
 */
export async function saveClub(formData: FormData, existing: Club | null, user: AdminUser) {
	const form = parseForm(clubFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	// Legacy checked uniqueness on create only; here also on rename, never against itself.
	if (data.name !== existing?.name && (await isClubNameTaken(data.name, existing?.id))) {
		errors.name = [m.clubs_name_taken()];
	}
	if (
		data.admin_user_id &&
		data.admin_user_id !== existing?.adminUserId &&
		!(await userExists(data.admin_user_id))
	) {
		errors.admin_user_id = [m.validation_not_found()];
	}
	let emblem: { bytes: Uint8Array; format: 'png' | 'svg' } | null = null;
	if (data.emblem) {
		const bytes = new Uint8Array(await data.emblem.arrayBuffer());
		const format = await detectImageFormat(bytes);
		if (format === 'png' || format === 'svg') emblem = { bytes, format };
		else errors.emblem = [m.validation_file_type({ types: 'PNG, SVG' })];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (emblem) {
		try {
			stored = await storeImage(emblem.bytes, emblem.format, {
				resize: { fit: 'square', size: IMAGE_LIMITS.squareSize },
				thumbnail: true
			});
		} catch (error) {
			console.error('[clubs] emblem upload failed:', error);
			return { failure: invalid({ emblem: [m.form_upload_failed()] }, values) };
		}
	}

	const columns = { ...clubColumns(data), ...(stored ? { emblem: stored.url } : {}) };

	let saved: { club: Club; media: Record<string, unknown> | null };
	try {
		saved = await db.transaction(async (tx) => {
			const media = stored
				? await insertImageMedia(tx, {
						userId: user.id,
						image: stored,
						tags: emblemTags(data.name)
					})
				: null;

			let id: number;
			if (existing) {
				id = existing.id;
				const changes = changedColumns(existing, columns);
				if (Object.keys(changes).length)
					await tx.update(clubs).set(changes).where(eq(clubs.id, id));
			} else {
				[{ id }] = await tx.insert(clubs).values(columns).$returningId();
			}
			const [club] = await tx.select().from(clubs).where(eq(clubs.id, id));
			return { club, media };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Club',
		oldValues: existing,
		newValues: saved.club
	});

	if (stored && existing?.emblem && existing.emblem !== stored.url) {
		await deleteReplacedEmblem(existing.emblem, existing.id);
	}

	return { club: saved.club };
}

/**
 * Removes a replaced emblem file, unless something still shows it: the media library (every
 * legacy upload has a `media` row that articles may use) or another club.
 */
async function deleteReplacedEmblem(url: string, clubId: number) {
	try {
		const [otherClub] = await db
			.select({ id: clubs.id })
			.from(clubs)
			.where(and(eq(clubs.emblem, url), ne(clubs.id, clubId)))
			.limit(1);
		if (otherClub || (await isInMediaLibrary(db, url))) return;
		await deleteFile(url);
	} catch (error) {
		console.warn('[clubs] could not clean up the replaced emblem:', error);
	}
}
