import { eq } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { articles } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { logger } from '#lib/server/log.ts';
import { insertImageMedia } from '#lib/server/media-library.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { isBlankHtml, storedHtml } from '#lib/server/rich-text.ts';
import {
	discardImage,
	readUploadedImage,
	storeImage,
	type StoredImage
} from '#lib/server/storage/uploads.ts';
import {
	articleDate,
	articleFormSchema,
	bodyImageTags,
	cleanTags,
	cleanTitle,
	coverTags
} from './form';
import { summarizeArticle } from './html';
import { findCoverMedia, type Article } from './index';

const log = logger.child('articles');

/** Reads an uploaded JPEG or PNG (real format from the bytes). */
const readImage = (file: File) => readUploadedImage(file, ['jpeg', 'png'] as const);

/**
 * Create (`existing` null) or update an article from the submitted form, with the legacy
 * `ArticleController` rules:
 * - one trailing `.`, `!` or `?` is dropped from the title, and an empty description becomes the
 *   start of the text
 * - the title of a visible article can't change (its public link is built from it); legacy
 *   silently kept the old title, here the field says why
 * - the date is set on create only
 * - the cover must be visible media, or a picture uploaded with the form (stored like any media
 *   library upload and added to the library with a thumbnail)
 * Returns the saved row, or the `fail()` the action must return.
 */
export async function saveArticle(formData: FormData, existing: Article | null, user: AdminUser) {
	const form = parseForm(articleFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	// An unchanged title is kept as stored (it may legitimately end with one `?` of two).
	const title = existing && data.title === existing.title ? existing.title : cleanTitle(data.title);
	if (existing && data.visible && title !== existing.title) {
		errors.title = [m.articles_title_locked()];
	}
	if (!existing && !data.date) errors.date = [m.validation_required()];

	let cover: Awaited<ReturnType<typeof readImage>> = null;
	if (data.cover) {
		cover = await readImage(data.cover);
		if (!cover) errors.cover = [m.validation_file_type({ types: 'JPEG, PNG' })];
	} else if (data.media_id && !(await findCoverMedia(data.media_id))) {
		errors.media_id = [m.validation_not_found()];
	}

	const text = storedHtml(data.text);
	if (isBlankHtml(text)) errors.text = [m.validation_required()];
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (cover) {
		try {
			stored = await storeImage(cover.bytes, cover.format, { thumbnail: true });
		} catch (error) {
			log.error('cover upload failed', error);
			return { failure: invalid({ cover: [m.form_upload_failed()] }, values) };
		}
	}

	const columns = {
		title,
		description: data.description ?? summarizeArticle(text),
		text,
		tags: cleanTags(data.tags),
		visible: data.visible
	};

	let saved: { article: Article; media: Record<string, unknown> | null };
	try {
		saved = await db.transaction(async (tx) => {
			const media = stored
				? await insertImageMedia(tx, {
						userId: user.id,
						image: stored,
						tags: coverTags({ title, tags: data.tags })
					})
				: null;
			const mediaId = media ? (media.id as number) : data.media_id;

			let id: number;
			if (existing) {
				id = existing.id;
				const changes = changedColumns(existing, { ...columns, mediaId });
				if (Object.keys(changes).length)
					await tx.update(articles).set(changes).where(eq(articles.id, id));
			} else {
				[{ id }] = await tx
					.insert(articles)
					.values({
						...columns,
						mediaId,
						userId: user.id,
						// Required above on create.
						date: articleDate(data.date as string),
						facebookPostId: null
					})
					.$returningId();
			}
			const [article] = await tx.select().from(articles).where(eq(articles.id, id));
			return { article, media };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Article',
		oldValues: existing,
		newValues: saved.article
	});

	return { article: saved.article };
}

/**
 * An image uploaded into the article text from the editor (legacy `CKEditorController@upload`):
 * stored like any media library upload, with a thumbnail and the legacy `ckeditor-upload` tags.
 * Legacy reused an earlier upload with the same file name, so two different pictures called
 * `image.png` (every pasted screenshot) showed the first one; each upload is stored here.
 * Returns the URL to show in the editor, or an error message.
 */
export async function uploadBodyImage(
	file: File,
	user: AdminUser
): Promise<{ url: string } | { error: string }> {
	const image = await readImage(file);
	if (!image) return { error: m.validation_file_type({ types: 'JPEG, PNG' }) };

	let stored: StoredImage;
	try {
		stored = await storeImage(image.bytes, image.format, { thumbnail: true });
	} catch (error) {
		log.error('text image upload failed', error);
		return { error: m.form_upload_failed() };
	}

	let media: Record<string, unknown>;
	try {
		media = await db.transaction((tx) =>
			insertImageMedia(tx, { userId: user.id, image: stored, tags: bodyImageTags(file.name) })
		);
	} catch (error) {
		await discardImage(stored);
		throw error;
	}
	await audit({ action: 'create', model: 'Media', newValues: media });

	return { url: mediaUrl(stored.url) as string };
}
