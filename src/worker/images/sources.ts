import { existsSync } from 'node:fs';
import { readFile as readLocalFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { mediaUrl } from '#lib/server/media.ts';
import { isStoredUrl, readFile } from '#lib/server/storage/index.ts';
import { assetPath } from '../assets.ts';

/** Legacy `custom.default_emblem`. */
export const DEFAULT_EMBLEM = '/images/default-emblem.png';

/**
 * Legacy `Media::getPlaceholder()`: one of ten stock backgrounds, picked by the id's last digit.
 */
export const placeholder = (ratio: '16_9' | '1_1', id: number) =>
	`/images/${ratio}_placeholder_${String(id).slice(-1)}.jpg`;

/**
 * Legacy `UploadStorage::source()` for the image paths stored in the database:
 * - `/storage/...` uploads come from R2;
 * - `/images/...` legacy static images come from the worker's copy (`assets/images`), or from the
 *   legacy site when they aren't copied;
 * - `http(s)://` URLs are downloaded.
 */
export async function loadImage(path: string): Promise<Uint8Array> {
	if (path.startsWith('/images/')) {
		const local = assetPath('images', basename(path));
		if (existsSync(local)) return new Uint8Array(await readLocalFile(local));
	} else if (isStoredUrl(path)) {
		return readFile(path);
	}

	const url = mediaUrl(path);
	if (!url) throw new Error(`No image at "${path}"`);
	const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
	if (!response.ok) throw new Error(`Image ${url}: HTTP ${response.status}`);
	return new Uint8Array(await response.arrayBuffer());
}
