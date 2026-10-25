import { and, eq, ne } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { slugify } from '#lib/slug.ts';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { pages } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { logger } from '#lib/server/log.ts';
import { insertImageMedia, isInMediaLibrary } from '#lib/server/media-library.ts';
import { isBlankHtml, storedHtml } from '#lib/server/rich-text.ts';
import { deleteFile } from '#lib/server/storage/index.ts';
import {
	discardImage,
	readUploadedImage,
	storeImage,
	type StoredImage
} from '#lib/server/storage/uploads.ts';
import { BODY_MAX_BYTES, byteLength, pageFormSchema, pictureTags } from './form';
import { isSlugTaken, type Page } from './index';

const log = logger.child('pages');

/**
 * Create (`existing` null) or update a page from the submitted form, with the legacy
 * `PageController` side effects:
 * - the slug (`/p/<slug>` on the public site) is made from the title on every save
 * - the optional picture is stored as a content image and added to the media library with a
 *   thumbnail; without one, legacy stores an empty string
 * Fixed legacy bugs: a title whose slug another page already has failed in SQL (unique index), a
 * body over the TEXT column failed in SQL, and the edit form offered a picture that the update
 * ignored. A replaced picture is deleted only when nothing else uses it.
 * Returns the saved row, or the `fail()` the action must return.
 */
export async function savePage(formData: FormData, existing: Page | null, user: AdminUser) {
	const form = parseForm(pageFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	const slug = slugify(data.title);
	if (!slug) errors.title = [m.pages_title_no_slug()];
	else if (slug !== existing?.slug && (await isSlugTaken(slug, existing?.id))) {
		errors.title = [m.pages_slug_taken({ slug })];
	}

	const body = storedHtml(data.body);
	if (isBlankHtml(body)) errors.body = [m.validation_required()];
	else if (byteLength(body) > BODY_MAX_BYTES) errors.body = [m.pages_body_too_long()];

	let picture: Awaited<ReturnType<typeof readUploadedImage<'jpeg' | 'png'>>> = null;
	if (data.picture) {
		picture = await readUploadedImage(data.picture, ['jpeg', 'png'] as const);
		if (!picture) errors.picture = [m.validation_file_type({ types: 'JPEG, PNG' })];
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

	const columns = {
		title: data.title,
		name: data.name,
		slug,
		body,
		visible: data.visible,
		...(stored ? { picture: stored.url } : {})
	};

	let saved: { page: Page; media: Record<string, unknown> | null };
	try {
		saved = await db.transaction(async (tx) => {
			const media = stored
				? await insertImageMedia(tx, {
						userId: user.id,
						image: stored,
						tags: pictureTags(data.title)
					})
				: null;

			let id: number;
			if (existing) {
				id = existing.id;
				const changes = changedColumns(existing, columns);
				if (Object.keys(changes).length)
					await tx.update(pages).set(changes).where(eq(pages.id, id));
			} else {
				[{ id }] = await tx
					.insert(pages)
					.values({ picture: '', ...columns })
					.$returningId();
			}
			const [page] = await tx.select().from(pages).where(eq(pages.id, id));
			return { page, media };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Page',
		oldValues: existing,
		newValues: saved.page
	});

	if (stored && existing?.picture && existing.picture !== stored.url) {
		await deleteReplacedPicture(existing.picture, existing.id);
	}

	return { page: saved.page };
}

/**
 * Removes a replaced picture file, unless something still shows it: the media library (every
 * legacy upload has a `media` row) or another page.
 */
async function deleteReplacedPicture(url: string, pageId: number) {
	try {
		const [otherPage] = await db
			.select({ id: pages.id })
			.from(pages)
			.where(and(eq(pages.picture, url), ne(pages.id, pageId)))
			.limit(1);
		if (otherPage || (await isInMediaLibrary(db, url))) return;
		await deleteFile(url);
	} catch (error) {
		log.warn('could not clean up the replaced picture', error);
	}
}
