import sharp from 'sharp';
import { IMAGE_LIMITS, keepsOriginal, optimizeImage, type OptimizeOptions } from './images';
import { deleteFile, storeFile, STORAGE_FOLDERS } from './index';

/** Image formats read from the file contents (never trust the browser's MIME type). */
export type ImageFormat = 'png' | 'jpeg' | 'gif' | 'svg' | 'webp';

const CONTENT_TYPES: Record<ImageFormat, string> = {
	png: 'image/png',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	svg: 'image/svg+xml',
	webp: 'image/webp'
};

/** The real format of an uploaded image, or null when it is not one sharp can read. */
export async function detectImageFormat(data: Uint8Array): Promise<ImageFormat | null> {
	try {
		const { format } = await sharp(data).metadata();
		return format && format in CONTENT_TYPES ? (format as ImageFormat) : null;
	} catch {
		return null;
	}
}

export type StoredImage = {
	/** `/storage/...` path saved in the database. */
	url: string;
	/** Legacy `media.thumbnail_url` (900 px JPEG), when requested. */
	thumbnailUrl: string | null;
};

/**
 * Optimises and uploads an image like the legacy `ImageOptimizer::store()`. GIF and SVG are
 * stored as uploaded. With `thumbnail`, also stores the legacy media library thumbnail
 * (`Media::generateThumbnail()`: at most 900 px, JPEG, generated quality). If any upload fails,
 * the files already stored are removed before the error is rethrown.
 */
export async function storeImage(
	data: Uint8Array,
	format: ImageFormat,
	{
		folder = STORAGE_FOLDERS.mediaImages,
		thumbnail = false,
		...options
	}: OptimizeOptions & { folder?: string; thumbnail?: boolean } = {}
): Promise<StoredImage> {
	const contentType = CONTENT_TYPES[format];
	const image = keepsOriginal(contentType)
		? { data, extension: format, contentType }
		: await optimizeImage(data, options);
	// Made from the stored image, like the legacy site (an emblem's thumbnail is square too).
	const thumb = thumbnail
		? await optimizeImage(image.data, {
				resize: { fit: 'inside', maxSize: 900 },
				format: 'jpg',
				quality: IMAGE_LIMITS.generatedQuality
			})
		: null;

	const stored: string[] = [];
	try {
		const url = await storeFile(folder, image.data, image.extension, image.contentType);
		stored.push(url);
		const thumbnailUrl = thumb
			? await storeFile(
					STORAGE_FOLDERS.mediaThumbnails,
					thumb.data,
					thumb.extension,
					thumb.contentType
				)
			: null;
		return { url, thumbnailUrl };
	} catch (error) {
		await Promise.all(stored.map((url) => deleteFile(url)));
		throw error;
	}
}

/** Removes the files of a `storeImage()` whose database write failed. */
export async function discardImage(image: StoredImage | null): Promise<void> {
	if (!image) return;
	await Promise.all([deleteFile(image.url), deleteFile(image.thumbnailUrl)]);
}
