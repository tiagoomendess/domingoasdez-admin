import { eq } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { articles, media } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { logger } from '#lib/server/log.ts';
import { deleteFile, storeFile, STORAGE_FOLDERS } from '#lib/server/storage/index.ts';
import { detectImageFormat, storeImage } from '#lib/server/storage/uploads.ts';
import {
	cleanTags,
	createMediaSchema,
	fileExtension,
	isVideoExtension,
	mediaTypeFromUrl,
	updateMediaSchema,
	type MediaType
} from './form';
import { fileInUse, mediaUsage, type Media } from './index';
import { makeThumbnail } from './thumbnails';

const log = logger.child('media');

/** What a stored file looks like before its `media` row exists. */
type Prepared = { url: string; thumbnailUrl: string | null; type: MediaType; files: string[] };

/** Formats stored as images (legacy: `jpg`, `jpeg`, `png`, `gif`, `svg`), read from the bytes. */
const IMAGE_FORMATS = new Set(['jpeg', 'png', 'gif', 'svg', 'webp']);

const VIDEO_TYPES: Record<string, string> = { mp4: 'video/mp4', avi: 'video/x-msvideo' };

async function storeThumbnail(data: Uint8Array) {
	return storeFile(STORAGE_FOLDERS.mediaThumbnails, data, 'jpg', 'image/jpeg');
}

/**
 * Stores an uploaded file like the legacy `MediaController@store`: images optimised (content
 * size, PNG only when transparent, GIF/SVG as uploaded) under `/storage/media/images`, `mp4`/`avi`
 * under `/storage/media/videos`, anything else under `/storage/media/files`. The real format of an
 * image is read from its bytes (legacy trusted the file name).
 */
async function prepareFile(file: File): Promise<Prepared> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	const format = await detectImageFormat(bytes);
	if (format && IMAGE_FORMATS.has(format)) {
		const stored = await storeImage(bytes, format, { thumbnail: true });
		return {
			url: stored.url,
			thumbnailUrl: stored.thumbnailUrl,
			type: 'image',
			files: [stored.url, stored.thumbnailUrl ?? ''].filter(Boolean)
		};
	}

	const extension = fileExtension(file.name);
	const video = isVideoExtension(extension);
	const url = await storeFile(
		video ? STORAGE_FOLDERS.mediaVideos : STORAGE_FOLDERS.mediaFiles,
		bytes,
		extension,
		VIDEO_TYPES[extension] ?? 'application/octet-stream'
	);
	const type: MediaType = video ? 'video' : 'other';
	try {
		const thumbnailUrl = await storeThumbnail(await makeThumbnail({ type, url }));
		return { url, thumbnailUrl, type, files: [url, thumbnailUrl] };
	} catch (error) {
		await deleteFile(url);
		throw error;
	}
}

/** A linked media item: only the thumbnail is stored (made from the link). */
async function prepareLink(url: string): Promise<Prepared> {
	const type = mediaTypeFromUrl(url);
	const thumbnailUrl = await storeThumbnail(await makeThumbnail({ type, url }));
	return { url, thumbnailUrl, type, files: [thumbnailUrl] };
}

async function urlTaken(url: string) {
	return (await db.$count(media, eq(media.url, url))) > 0;
}

/**
 * Creates a media item from an upload or a link, with its thumbnail. Legacy created the row and
 * then failed on the thumbnail (leaving an item without one); here nothing is created unless the
 * thumbnail is made. Returns the row, or the `fail()` the action must return.
 */
export async function createMedia(formData: FormData, user: AdminUser) {
	const form = parseForm(createMediaSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	if (data.source === 'url') {
		if (!data.url) errors.url = [m.validation_required()];
		// Legacy `unique:media,url`.
		else if (await urlTaken(data.url)) errors.url = [m.media_url_taken()];
	} else if (!data.file) {
		errors.file = [m.validation_required()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let prepared: Prepared;
	try {
		prepared = data.source === 'url' ? await prepareLink(data.url!) : await prepareFile(data.file!);
	} catch (error) {
		log.error('upload or thumbnail failed', error);
		const field = data.source === 'url' ? 'url' : 'file';
		return {
			failure: invalid(
				{ [field]: [data.source === 'url' ? m.media_link_failed() : m.form_upload_failed()] },
				values
			)
		};
	}

	let row: Media;
	try {
		row = await db.transaction(async (tx) => {
			const [{ id }] = await tx
				.insert(media)
				.values({
					userId: user.id,
					url: prepared.url,
					thumbnailUrl: prepared.thumbnailUrl,
					mediaType: prepared.type,
					tags: cleanTags(data.tags),
					visible: data.visible
				})
				.$returningId();
			const [created] = await tx.select().from(media).where(eq(media.id, id));
			return created;
		});
	} catch (error) {
		await Promise.all(prepared.files.map((file) => deleteFile(file)));
		throw error;
	}

	await audit({ action: 'create', model: 'Media', newValues: row });
	return { media: row };
}

/** Legacy `MediaController@update`: tags and visibility. */
export async function updateMedia(formData: FormData, existing: Media) {
	const form = parseForm(updateMediaSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };

	const changes = changedColumns(existing, {
		tags: cleanTags(form.data.tags),
		visible: form.data.visible
	});
	if (Object.keys(changes).length) {
		await db.update(media).set(changes).where(eq(media.id, existing.id));
	}
	const [row] = await db.select().from(media).where(eq(media.id, existing.id));
	await audit({ action: 'update', model: 'Media', oldValues: existing, newValues: row });
	return { media: row };
}

/**
 * Legacy `MediaController@destroy`: articles using the item as cover lose it first (the foreign
 * key would delete them), then the row and, for stored files, the file and its thumbnail.
 * Unlike legacy, a file that other records still show (texts, pictures, another media item) is
 * kept: only the row and the thumbnail go. Returns how many covers were cleared and whether the
 * file was kept.
 */
export async function deleteMedia(item: Media) {
	const stored = !item.url.includes('http');
	const keepFile = stored && fileInUse(await mediaUsage(item)) > 0;

	const covers = await db.transaction(async (tx) => {
		const affected = await tx.select().from(articles).where(eq(articles.mediaId, item.id));
		if (affected.length) {
			await tx.update(articles).set({ mediaId: null }).where(eq(articles.mediaId, item.id));
		}
		await tx.delete(media).where(eq(media.id, item.id));
		return affected;
	});

	for (const article of covers) {
		await audit({
			action: 'update',
			model: 'Article',
			oldValues: article,
			newValues: { ...article, mediaId: null }
		});
	}
	await audit({ action: 'delete', model: 'Media', oldValues: item });
	// Legacy: "if it does not have http it's a local file". Links keep their thumbnail, as before.
	if (stored) {
		await Promise.all([keepFile ? null : deleteFile(item.url), deleteFile(item.thumbnailUrl)]);
	}
	return { covers: covers.length, keptFile: keepFile };
}
