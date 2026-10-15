/**
 * Port of the legacy App\Services\UploadStorage URL rules. The database stores public paths such
 * as `/storage/media/images/<uuid>.jpg`; the R2 object key is the same path without the leading
 * slash (`storage/media/images/<uuid>.jpg`). Both apps write to the same bucket.
 */

export const STORAGE_URL_PREFIX = '/storage/';

/** Folders the legacy site already uses. New entities can add their own under /storage/. */
export const STORAGE_FOLDERS = {
	mediaImages: '/storage/media/images',
	mediaVideos: '/storage/media/videos',
	mediaFiles: '/storage/media/files',
	mediaThumbnails: '/storage/media/thumbnails',
	userAvatars: '/storage/uploads/users/avatars',
	pollImages: '/storage/poll_images',
	gameImages: '/storage/game_images',
	tmp: '/storage/tmp'
} as const;

const TMP_PREFIX = `${STORAGE_FOLDERS.tmp}/`;

/** Files named by `newStorageUrl()` never change, so the CDN can cache them forever. */
export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';
/** Files in /storage/tmp/ keep readable names that get rewritten. */
export const CACHE_SHORT = 'public, max-age=3600';

export function isStoredUrl(url: string | null | undefined): url is string {
	return typeof url === 'string' && url.startsWith(STORAGE_URL_PREFIX);
}

/** A new, never reused URL inside a /storage/... folder, e.g. /storage/media/images/<uuid>.jpg */
export function newStorageUrl(folderUrl: string, extension: string): string {
	if (!isStoredUrl(`${folderUrl.replace(/\/+$/, '')}/`)) {
		throw new Error(`Not a storage folder: ${folderUrl}`);
	}
	const ext = extension.replace(/^\./, '').toLowerCase();
	if (!/^[a-z0-9]{1,8}$/.test(ext)) throw new Error(`Invalid file extension: ${extension}`);
	return `${folderUrl.replace(/\/+$/, '')}/${crypto.randomUUID()}.${ext}`;
}

/** `/storage/media/x.jpg` → `storage/media/x.jpg` (the R2 object key). */
export function storageKey(url: string): string {
	if (!isStoredUrl(url)) throw new Error(`Not a storage URL: ${url}`);
	const key = url.slice(1).replace(/\/+$/, '');
	if (key.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')) {
		throw new Error(`Unsafe storage URL: ${url}`);
	}
	return key;
}

export function cacheControlFor(url: string): string {
	return url.startsWith(TMP_PREFIX) ? CACHE_SHORT : CACHE_IMMUTABLE;
}
