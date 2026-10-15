import { z } from 'zod';
import type { mediaTypes } from '#lib/server/db/schema.ts';
import { checkbox } from '#lib/server/forms.ts';
import { optionalUrl, requiredText } from '#lib/server/validation.ts';

export type MediaType = (typeof mediaTypes)[number];

/** Legacy `file: max:200000` (kilobytes). Production needs `BODY_SIZE_LIMIT` above this. */
export const FILE_MAX_BYTES = 200000 * 1024;

/** Any file: browsers send an empty, nameless one when nothing is picked. */
const anyFile = z
	.custom<File | undefined>((value) => value === undefined || value instanceof File)
	.transform((file) => (file && file.size > 0 ? file : null))
	.pipe(z.file().max(FILE_MAX_BYTES).nullable());

/**
 * Legacy `MediaController@store`: tags, and a link or a file (`required_without`). With both,
 * legacy kept the link; the form sends only the one picked.
 */
export const createMediaSchema = z.object({
	tags: requiredText(255),
	source: z.enum(['file', 'url']).catch('file'),
	url: optionalUrl(255),
	file: anyFile.optional().transform((file) => file ?? null),
	visible: checkbox
});

/** Legacy `MediaController@update`: only the tags and the visibility change. */
export const updateMediaSchema = z.object({
	tags: requiredText(255),
	visible: checkbox
});

export type CreateMediaForm = z.output<typeof createMediaSchema>;

/** Legacy `str_replace(', ', ',', $tags)`. */
export const cleanTags = (tags: string) => tags.replaceAll(', ', ',');

/**
 * Type of a linked media item, from the legacy checks in the same order (a later match wins).
 * Legacy looked for `.jpeg`, `.png` and `.gif` only, so `.jpg` links were "other"; fixed here.
 */
export function mediaTypeFromUrl(url: string): MediaType {
	const value = url.toLowerCase();
	let type: MediaType = 'other';
	if (['youtube.com', 'youtu.be', 'youtube'].some((part) => value.includes(part))) type = 'youtube';
	if (['.jpg', '.jpeg', '.png', '.gif'].some((part) => value.includes(part))) type = 'image';
	if (['.mp4', '.avi', '.mpeg'].some((part) => value.includes(part))) type = 'video';
	return type;
}

/** Legacy file extension: lower case, letters and digits only, `bin` when nothing is left. */
export function fileExtension(fileName: string): string {
	const dot = fileName.lastIndexOf('.');
	const extension = dot >= 0 ? fileName.slice(dot + 1) : '';
	return (
		extension
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '')
			.slice(0, 10) || 'bin'
	);
}

/** Uploaded videos (legacy: `mp4`, `avi`); images are recognised from their bytes instead. */
export const isVideoExtension = (extension: string) => ['mp4', 'avi'].includes(extension);

/** YouTube video id of a watch, short, embed or youtu.be link. */
export function youtubeId(url: string): string | null {
	const match =
		/[?&]v=([\w-]{6,})/.exec(url) ??
		/youtu\.be\/([\w-]{6,})/.exec(url) ??
		/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([\w-]{6,})/.exec(url);
	return match?.[1] ?? null;
}

/** Text of the generic thumbnail: the last three letters/digits of the URL (legacy regex). */
export function thumbnailLabel(url: string): string {
	return (/[a-zA-Z0-9]{3}$/.exec(url)?.[0] ?? 'URL').toUpperCase();
}
