import { and, eq, ne } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { partners } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { logger } from '#lib/server/log.ts';
import { insertImageMedia, isInMediaLibrary } from '#lib/server/media-library.ts';
import { deleteFile } from '#lib/server/storage/index.ts';
import {
	detectImageFormat,
	discardImage,
	storeImage,
	type StoredImage
} from '#lib/server/storage/uploads.ts';
import { partnerColumns, partnerFormSchema, pictureTags } from './form';
import type { Partner } from './index';

const log = logger.child('partners');

/**
 * Create (`existing` null) or update a partner from the submitted form, with the legacy
 * `PartnerController` side effects: the picture is stored as a content image (at most 2048 px,
 * PNG only when it uses transparency) and added to the media library with a thumbnail. The
 * picture is required on create and optional on edit, where it replaces the current one (the
 * legacy edit form could not change it). Returns the saved row, or the `fail()` the action must
 * return.
 */
export async function savePartner(formData: FormData, existing: Partner | null, user: AdminUser) {
	const form = parseForm(partnerFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	let picture: { bytes: Uint8Array; format: 'jpeg' | 'png' } | null = null;
	if (data.picture) {
		const bytes = new Uint8Array(await data.picture.arrayBuffer());
		const format = await detectImageFormat(bytes);
		if (format === 'jpeg' || format === 'png') picture = { bytes, format };
		else errors.picture = [m.validation_file_type({ types: 'JPEG, PNG' })];
	} else if (!existing) {
		errors.picture = [m.validation_required()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (picture) {
		try {
			stored = await storeImage(picture.bytes, picture.format, { thumbnail: true });
		} catch (error) {
			log.error('picture upload failed', error);
			return { failure: invalid({ picture: [m.form_upload_failed()] }, values) };
		}
	}

	let saved: { partner: Partner; media: Record<string, unknown> | null };
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
			if (existing) {
				id = existing.id;
				const columns = { ...partnerColumns(data), ...(stored ? { picture: stored.url } : {}) };
				const changes = changedColumns(existing, columns);
				if (Object.keys(changes).length)
					await tx.update(partners).set(changes).where(eq(partners.id, id));
			} else {
				// The picture is required on create, so `stored` is set.
				const url = (stored as StoredImage).url;
				[{ id }] = await tx
					.insert(partners)
					.values({ ...partnerColumns(data), picture: url })
					.$returningId();
			}
			const [partner] = await tx.select().from(partners).where(eq(partners.id, id));
			return { partner, media };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Partner',
		oldValues: existing,
		newValues: saved.partner
	});

	if (stored && existing?.picture && existing.picture !== stored.url) {
		await deleteReplacedPicture(existing.picture, existing.id);
	}

	return { partner: saved.partner };
}

/**
 * Removes a replaced picture file, unless something still shows it: the media library (every
 * legacy upload has a `media` row that articles may use) or another partner.
 */
async function deleteReplacedPicture(url: string, partnerId: number) {
	try {
		const [otherPartner] = await db
			.select({ id: partners.id })
			.from(partners)
			.where(and(eq(partners.picture, url), ne(partners.id, partnerId)))
			.limit(1);
		if (otherPartner || (await isInMediaLibrary(db, url))) return;
		await deleteFile(url);
	} catch (error) {
		log.warn('could not clean up the replaced picture', error);
	}
}
