import { m } from '#lib/paraglide/messages.js';
import {
	readUploadedImage,
	storeImage,
	type ImageFormat,
	type StoredImage
} from '#lib/server/storage/uploads.ts';

/**
 * Legacy `MediaController::storeImage()`: an uploaded picture (logo, cover…) checked against its
 * real format, stored as a content image (max 2048 px) with a media library thumbnail. The caller
 * adds the `media` row (`insertImageMedia`) in its transaction. Returns the stored image, or the
 * error to show on the field.
 */
export async function storeUploadedPicture(
	file: File,
	formats: readonly ImageFormat[],
	typesLabel: string
): Promise<{ stored: StoredImage } | { error: string }> {
	const picture = await readUploadedImage(file, formats);
	if (!picture) return { error: m.validation_file_type({ types: typesLabel }) };
	try {
		return { stored: await storeImage(picture.bytes, picture.format, { thumbnail: true }) };
	} catch (error) {
		console.error('[pictures] upload failed:', error);
		return { error: m.form_upload_failed() };
	}
}
