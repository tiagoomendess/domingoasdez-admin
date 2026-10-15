import { MEDIA_BASE_URL, MEDIA_CDN_BASE_URL, MEDIA_CDN_ENABLED } from '$app/env/private';
import { STORAGE_URL_PREFIX } from '#lib/server/storage/paths.ts';

export const DEFAULT_PROFILE_PICTURE = '/images/default-profile.png';
export const DEFAULT_EMBLEM = '/images/default-emblem.png';

/**
 * Turns a path stored in the database into an absolute URL the browser can load.
 * - `http(s)://...` (YouTube, external images) passes through
 * - `/storage/...` uploads come from the R2 public domain when MEDIA_CDN_ENABLED, else the legacy site
 * - anything else (`/images/...`) is a static asset of the legacy site
 */
export function mediaUrl(path: string | null | undefined): string | null {
	const value = path?.trim();
	if (!value) return null;
	if (/^https?:\/\//i.test(value)) return value;

	const relative = value.startsWith('/') ? value : `/${value}`;
	const base =
		MEDIA_CDN_ENABLED && relative.startsWith(STORAGE_URL_PREFIX)
			? MEDIA_CDN_BASE_URL
			: MEDIA_BASE_URL;
	return `${base ?? ''}${relative}`;
}

export function profilePictureUrl(path: string | null | undefined): string {
	return mediaUrl(path) ?? (mediaUrl(DEFAULT_PROFILE_PICTURE) as string);
}
