import { m } from '#lib/paraglide/messages.js';

/** `media.media_type` values (same list as the schema enum, usable in the browser). */
export const MEDIA_TYPES = ['image', 'video', 'youtube', 'download', 'other', 'none'] as const;

export type MediaTypeName = (typeof MEDIA_TYPES)[number];

const LABELS: Record<MediaTypeName, () => string> = {
	image: m.media_type_image,
	video: m.media_type_video,
	youtube: m.media_type_youtube,
	download: m.media_type_download,
	other: m.media_type_other,
	none: m.media_type_none
};

export const mediaTypeLabel = (type: string) =>
	(LABELS[type as MediaTypeName] ?? m.media_type_other)();

export const mediaTypeOptions = () =>
	MEDIA_TYPES.map((type) => ({ value: type, label: mediaTypeLabel(type) }));
