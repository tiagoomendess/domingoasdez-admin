import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand
} from '@aws-sdk/client-s3';
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

/** The bytes of a stored file (legacy `UploadStorage::get()`). Throws when it doesn't exist. */
export async function readFile(url: string): Promise<Uint8Array> {
	const { client, bucket } = r2();
	const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey(url) }));
	if (!object.Body) throw new Error(`Empty storage object: ${url}`);
	return object.Body.transformToByteArray();
}

export type StoredFile = { url: string; lastModified: Date | null };

/**
 * The files directly inside a /storage/... folder, not those in its subfolders (like Laravel's
 * `Storage::files()`, which the legacy UploadStorage::files() uses).
 */
export async function listFiles(folderUrl: string): Promise<StoredFile[]> {
	const { client, bucket } = r2();
	const prefix = `${storageKey(folderUrl)}/`;
	const files: StoredFile[] = [];
	let token: string | undefined;
	do {
		const page = await client.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				Delimiter: '/',
				ContinuationToken: token
			})
		);
		for (const object of page.Contents ?? []) {
			if (!object.Key || object.Key === prefix) continue;
			files.push({ url: `/${object.Key}`, lastModified: object.LastModified ?? null });
		}
		token = page.IsTruncated ? page.NextContinuationToken : undefined;
	} while (token);
	return files;
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
