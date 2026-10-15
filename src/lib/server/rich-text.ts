import { MEDIA_BASE_URL, MEDIA_CDN_BASE_URL } from '$app/env/private';
import {
	sanitizeArticleHtml,
	toEditorHtml,
	toStoredHtml,
	trimTrailingEmptyParagraphs
} from '#lib/server/articles/html.ts';
import { mediaUrl } from '#lib/server/media.ts';

/**
 * Rich text bodies (articles, pages) between the database and `RichTextField`. The pure helpers
 * live in `articles/html.ts`; these bind them to the configured media origins.
 */

/** Origins the editor shows uploads from; their URLs are stored back as `/storage/...` paths. */
const MEDIA_ORIGINS = [MEDIA_BASE_URL, MEDIA_CDN_BASE_URL];

/** Stored body → editor value (upload paths become loadable URLs). */
export function editorHtml(stored: string): string {
	return toEditorHtml(stored, mediaUrl);
}

/** Submitted editor HTML → stored body: upload paths, sanitised, no trailing empty paragraph. */
export function storedHtml(submitted: string): string {
	return trimTrailingEmptyParagraphs(sanitizeArticleHtml(toStoredHtml(submitted, MEDIA_ORIGINS)));
}

/** True when a body has no text and nothing visible (an image, video, table or rule). */
export function isBlankHtml(html: string): boolean {
	return !html.replace(/<[^>]*>|&nbsp;|\s/g, '') && !/<(img|video|table|hr)\b/i.test(html);
}
