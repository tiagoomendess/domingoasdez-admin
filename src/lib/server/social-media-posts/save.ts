import { eq } from 'drizzle-orm';
import { fromLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { socialMediaPosts } from '#lib/server/db/schema.ts';
import { invalid, parseForm } from '#lib/server/forms.ts';
import { logger } from '#lib/server/log.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { deleteFile, STORAGE_URL_PREFIX } from '#lib/server/storage/index.ts';
import { detectImageFormat, storeImage, type StoredImage } from '#lib/server/storage/uploads.ts';
import { postErrors, postFormSchema } from './form';
import type { SocialMediaPost } from './index';

const log = logger.child('social-media-posts');

/** Uploaded post images (kept until the post is deleted, unlike the jobs' /storage/tmp images). */
export const SOCIAL_MEDIA_FOLDER = '/storage/social_media';

/**
 * The `/storage/social_media/...` file behind a `media_path` (a public URL, which the Graph API
 * downloads), or null for any other image.
 */
export function uploadedFile(mediaPath: string | null): string | null {
	if (!mediaPath) return null;
	const prefix = mediaUrl(STORAGE_URL_PREFIX);
	if (!prefix || !mediaPath.startsWith(prefix)) return null;
	const path = `${STORAGE_URL_PREFIX}${mediaPath.slice(prefix.length)}`;
	return path.startsWith(`${SOCIAL_MEDIA_FOLDER}/`) ? path : null;
}

/**
 * Create (`existing` null) or update a post that isn't published yet. Changing anything resets
 * what `publish-social-media` prepared (media id, error), so the post is prepared again.
 */
export async function savePost(
	formData: FormData,
	existing: SocialMediaPost | null,
	timeZone: string,
	now = new Date()
) {
	const form = parseForm(postFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const publishAt = fromLocalInput(data.publish_at, timeZone);
	if (!publishAt) return { failure: invalid({ publish_at: [m.validation_date()] }, values) };
	const errors = postErrors(data, {
		publishAt,
		now,
		timeChanged: !existing || existing.publishAt.getTime() !== publishAt.getTime(),
		hasMedia: Boolean(data.media_path || data.image)
	});

	let upload: { bytes: Uint8Array; format: 'jpeg' | 'png' } | null = null;
	if (data.image && !errors.image) {
		const bytes = new Uint8Array(await data.image.arrayBuffer());
		const format = await detectImageFormat(bytes);
		if (format === 'jpeg' || format === 'png') upload = { bytes, format };
		else errors.image = [m.validation_file_type({ types: 'JPEG, PNG' })];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (upload) {
		try {
			stored = await storeImage(upload.bytes, upload.format, { folder: SOCIAL_MEDIA_FOLDER });
		} catch (error) {
			log.error('image upload failed', error);
			return { failure: invalid({ image: [m.form_upload_failed()] }, values) };
		}
	}

	const columns = {
		platform: data.platform,
		postType: data.post_type,
		postContentType: data.post_content_type,
		mediaPath:
			data.post_content_type === 'text' ? null : stored ? mediaUrl(stored.url) : data.media_path,
		textContent: data.text_content,
		publishAt
	};

	let post: SocialMediaPost;
	try {
		post = await db.transaction(async (tx) => {
			let id: number;
			if (existing) {
				id = existing.id;
				const changes = changedColumns(existing, columns);
				if (Object.keys(changes).length) {
					await tx
						.update(socialMediaPosts)
						.set({ ...changes, mediaExternalId: null, errorMessage: null, postId: null })
						.where(eq(socialMediaPosts.id, id));
				}
			} else {
				[{ id }] = await tx.insert(socialMediaPosts).values(columns).$returningId();
			}
			const [row] = await tx.select().from(socialMediaPosts).where(eq(socialMediaPosts.id, id));
			return row;
		});
	} catch (error) {
		if (stored) await deleteFile(stored.url);
		throw error;
	}

	await audit({
		action: existing ? 'update' : 'create',
		model: 'SocialMediaPost',
		oldValues: existing,
		newValues: post
	});
	// A replaced upload of this post is no longer used.
	const previous = uploadedFile(existing?.mediaPath ?? null);
	if (previous && existing?.mediaPath !== post.mediaPath) await deleteFile(previous);
	return { post };
}

/**
 * Publish a failed or missed post again: back to unpublished, nothing prepared, no error, due in a
 * minute (inside the publish job's window).
 */
export async function retryPost(post: SocialMediaPost, now = new Date()) {
	await db
		.update(socialMediaPosts)
		.set({
			published: false,
			postId: null,
			mediaExternalId: null,
			errorMessage: null,
			publishAt: new Date(now.getTime() + 60_000)
		})
		.where(eq(socialMediaPosts.id, post.id));
	const [updated] = await db
		.select()
		.from(socialMediaPosts)
		.where(eq(socialMediaPosts.id, post.id));
	await audit({
		action: 'update',
		model: 'SocialMediaPost',
		oldValues: post,
		newValues: updated,
		extraInfo: 'retry'
	});
	return updated;
}

/** Deletes the row (not the published post on Facebook or Instagram) and its uploaded image. */
export async function deletePost(post: SocialMediaPost) {
	await db.delete(socialMediaPosts).where(eq(socialMediaPosts.id, post.id));
	await audit({ action: 'delete', model: 'SocialMediaPost', oldValues: post });
	const file = uploadedFile(post.mediaPath);
	if (file) await deleteFile(file);
}
