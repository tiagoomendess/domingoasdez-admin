import { deleteFile, listFiles, STORAGE_FOLDERS } from '#lib/server/storage/index.ts';
import type { JobContext } from '../job.ts';
import { expiredFiles, isPlaceholder } from './cleanup-tmp-folder.rules.ts';

/**
 * Legacy `CleanupTmpFolder`: deletes the /storage/tmp files (social media images, published the
 * day they're made) older than 3 days.
 */
export async function run({ log, signal }: JobContext) {
	const files = (await listFiles(STORAGE_FOLDERS.tmp)).filter((file) => !isPlaceholder(file));
	const expired = expiredFiles(files, new Date());
	let deleted = 0;
	for (const file of expired) {
		if (signal.aborted) break;
		await deleteFile(file.url);
		deleted++;
		log.debug(`deleted ${file.url}`);
	}
	log.info(`deleted ${deleted} file(s), kept ${files.length - deleted}`);
}
