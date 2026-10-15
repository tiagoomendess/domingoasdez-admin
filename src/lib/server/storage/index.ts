import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { cacheControlFor, isStoredUrl, newStorageUrl, storageKey } from './paths';
import { r2 } from './r2';

export * from './paths';

/** Uploads bytes under a /storage/... URL (the value saved in the database). */
export async function putFile(url: string, body: Uint8Array, contentType: string): Promise<void> {
	const { client, bucket } = r2();
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: storageKey(url),
			Body: body,
			ContentType: contentType,
			CacheControl: cacheControlFor(url)
		})
	);
}

/** Stores a file under a new random name in `folderUrl` and returns its /storage/... URL. */
export async function storeFile(
	folderUrl: string,
	body: Uint8Array,
	extension: string,
	contentType: string
): Promise<string> {
	const url = newStorageUrl(folderUrl, extension);
	await putFile(url, body, contentType);
	return url;
}

/**
 * Deletes a stored file. Never throws: a missing file must not break the flow that removes it
 * (same contract as the legacy UploadStorage::delete). Non-/storage/ URLs are ignored.
 */
export async function deleteFile(url: string | null | undefined): Promise<void> {
	if (!isStoredUrl(url)) return;
	try {
		const { client, bucket } = r2();
		await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey(url) }));
	} catch (error) {
		console.warn(`[storage] failed to delete ${url}:`, error);
	}
}
