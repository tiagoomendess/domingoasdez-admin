import { z } from 'zod';
import { isLocalDateTime } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import type { FieldErrors } from '#lib/server/forms.ts';
import { optional, optionalFile, optionalText, required } from '#lib/server/validation.ts';

export const PLATFORMS = ['facebook', 'instagram'] as const;
export const POST_TYPES = ['post', 'story'] as const;
export const CONTENT_TYPES = ['text', 'image', 'video'] as const;
export const POST_STATUSES = ['pending', 'published', 'failed', 'missed'] as const;

export type Platform = (typeof PLATFORMS)[number];
export type PostType = (typeof POST_TYPES)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];
/** Filter values; `pending` covers "scheduled" and "prepared". */
export type PostStatusFilter = (typeof POST_STATUSES)[number];
export type PostStatus = 'scheduled' | 'prepared' | 'published' | 'failed' | 'missed';

/** `publish-social-media` skips a post more than 5 minutes late. */
export const PUBLISH_LATE_MS = 5 * 60 * 1000;
/** `text_content` and `media_path` columns. */
export const TEXT_MAX = 512;
export const MEDIA_MAX = 512;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png'] as const;

// Any http(s) host, unlike `optionalUrl()`: uploads get `mediaUrl()` addresses, which locally are
// on localhost (LocalStack). The Graph API reports an address it can't download as the post's error.
const mediaPath = optional(z.url({ protocol: /^https?$/ }).max(MEDIA_MAX));

const localDateTime = z.string().refine(isLocalDateTime, { error: () => m.validation_date() });

export const postFormSchema = z.object({
	platform: required(z.enum(PLATFORMS)),
	post_type: required(z.enum(POST_TYPES)),
	post_content_type: required(z.enum(CONTENT_TYPES)),
	media_path: mediaPath,
	image: optionalFile({ maxBytes: 20 * 1024 * 1024, types: UPLOAD_TYPES, typesLabel: 'JPEG, PNG' }),
	text_content: optionalText(TEXT_MAX),
	publish_at: required(localDateTime)
});

export type PostForm = z.output<typeof postFormSchema>;

/**
 * What `publish-social-media` can publish (see its rules): text only as a Facebook post (with
 * the text), stories and Instagram need an image or a video, and stories carry no text. A new or
 * moved publication time must be in the future.
 */
export function postErrors(
	form: Omit<PostForm, 'publish_at'>,
	context: { publishAt: Date; now: Date; timeChanged: boolean; hasMedia: boolean }
): FieldErrors {
	const errors: FieldErrors = {};
	if (form.post_content_type === 'text') {
		if (form.platform !== 'facebook' || form.post_type !== 'post') {
			errors.post_content_type = [m.social_posts_text_only_facebook_posts()];
		} else if (!form.text_content) {
			errors.text_content = [m.validation_required()];
		}
	} else {
		if (!context.hasMedia) errors.media_path = [m.social_posts_media_required()];
		if (form.post_content_type === 'video' && form.image) {
			errors.image = [m.social_posts_video_url_only()];
		}
	}
	if (form.post_type === 'story' && form.text_content) {
		errors.text_content = [m.social_posts_story_no_text()];
	}
	if (context.timeChanged && context.publishAt.getTime() < context.now.getTime()) {
		errors.publish_at = [m.social_posts_publish_at_future()];
	}
	return errors;
}

/**
 * The post's state for the admin (badge). A post with a network id is published even with an error:
 * a retry succeeded after it (the job keeps the earlier error, as legacy did). Legacy marked a
 * failed Facebook post published without an id: that one is failed.
 */
export function postStatus(
	post: {
		published: boolean;
		postId: string | null;
		errorMessage: string | null;
		mediaExternalId: string | null;
		publishAt: Date;
	},
	now = new Date()
): PostStatus {
	if (post.published && post.postId) return 'published';
	if (post.errorMessage) return 'failed';
	if (post.published) return 'published';
	if (post.publishAt.getTime() < now.getTime() - PUBLISH_LATE_MS) return 'missed';
	return post.mediaExternalId ? 'prepared' : 'scheduled';
}

/** Retry makes sense for a failed post or one whose time passed unpublished. */
export const canRetry = (status: PostStatus) => status === 'failed' || status === 'missed';

export function parseStatusFilter(url: URL): PostStatusFilter | null {
	const value = url.searchParams.get('status');
	return (POST_STATUSES as readonly string[]).includes(value ?? '')
		? (value as PostStatusFilter)
		: null;
}

export function parsePlatformFilter(url: URL): Platform | null {
	const value = url.searchParams.get('platform');
	return (PLATFORMS as readonly string[]).includes(value ?? '') ? (value as Platform) : null;
}
