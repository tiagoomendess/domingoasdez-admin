import type { StoredFile } from '#lib/server/storage/index.ts';

/** Legacy `CleanupTmpFolder::DAYS_TO_KEEP`. */
export const DAYS_TO_KEEP = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The folder's `.gitkeep` placeholder: never deleted, not counted. */
export const isPlaceholder = (file: StoredFile) => file.url.endsWith('/.gitkeep');

/**
 * The /storage/tmp files to delete: older than 3 days, except the placeholder. A file without a
 * modification date is kept.
 */
export function expiredFiles(files: StoredFile[], now: Date): StoredFile[] {
	const cutoff = now.getTime() - DAYS_TO_KEEP * DAY_MS;
	return files.filter(
		(file) =>
			!isPlaceholder(file) && file.lastModified !== null && file.lastModified.getTime() < cutoff
	);
}
