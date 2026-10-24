import { mediaUrl } from '#lib/server/media.ts';
import { putFile } from '#lib/server/storage/index.ts';

/** A `social_media_posts` row to create (published later by `publish-social-media`). */
export type PlannedPost = {
	platform: 'facebook' | 'instagram';
	postType: 'post' | 'story';
	postContentType: 'text' | 'image';
	mediaPath: string | null;
	textContent: string | null;
	publishAt: Date;
};

/** Legacy `FB_AND_IG`: an image post or story on Facebook, then the same on Instagram. */
export const imagePosts = (
	postType: PlannedPost['postType'],
	mediaPath: string,
	publishAt: Date,
	textContent: string | null = null
): PlannedPost[] =>
	(['facebook', 'instagram'] as const).map((platform) => ({
		platform,
		postType,
		postContentType: 'image',
		mediaPath,
		textContent,
		publishAt
	}));

/**
 * Stores a generated image under /storage/tmp (short cache, deleted after 3 days by
 * `cleanup-tmp-folder`) and returns its public URL, which the Graph API downloads (legacy
 * `UploadStorage::putImage()` + `publicUrl()`).
 */
export async function storeTmpImage(name: string, jpeg: Uint8Array): Promise<string> {
	const path = `/storage/tmp/${name}`;
	await putFile(path, jpeg, 'image/jpeg');
	return mediaUrl(path)!;
}

/** Legacy `now()->format('Y_m_d')` in file names (UTC). */
export const fileDay = (now: Date) => now.toISOString().slice(0, 10).replaceAll('-', '_');
