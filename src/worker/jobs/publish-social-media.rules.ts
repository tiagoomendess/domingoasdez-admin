import { GraphError, type SocialPoster } from '../social/graph.ts';

/** Posts are prepared from 15 minutes before their time (and up to 1 minute after). */
export const PREPARE_AHEAD_MS = 15 * 60 * 1000;
export const PREPARE_LATE_MS = 60 * 1000;
/** A post more than 5 minutes late is skipped (legacy: never published, left as it is). */
export const PUBLISH_LATE_MS = 5 * 60 * 1000;

export type SocialPost = {
	id: number;
	platform: 'facebook' | 'instagram';
	postType: 'post' | 'story';
	postContentType: 'text' | 'image' | 'video';
	mediaPath: string | null;
	textContent: string | null;
	mediaExternalId: string | null;
};

const LINK = /https?:\/\/[^\s]+/;

/**
 * Legacy Facebook text posts: the first link becomes the post's link (preview card) and every
 * link is removed from the message (the spaces around them stay).
 */
export function splitLink(text: string | null): { message: string | null; link: string | null } {
	if (!text) return { message: text, link: null };
	return {
		message: text.replace(new RegExp(LINK, 'g'), ''),
		link: LINK.exec(text)?.[0] ?? null
	};
}

/**
 * Phase 1 (legacy `preparePostsForPublish`): the Graph call that uploads a post's media ahead,
 * returning the id saved as `media_external_id`. Facebook posts need none (published in one call);
 * a text story or Instagram text post can't be prepared (null: legacy logged it and skipped it).
 */
export function prepareCall(
	post: SocialPost,
	poster: SocialPoster
): { kind: 'none' } | { kind: 'invalid' } | { kind: 'call'; run: () => Promise<string> } {
	const media = post.mediaPath ?? '';
	if (post.platform === 'facebook' && post.postType === 'post') return { kind: 'none' };
	if (post.postContentType === 'text') return { kind: 'invalid' };
	const video = post.postContentType === 'video';
	if (post.platform === 'facebook') {
		return {
			kind: 'call',
			run: () =>
				video
					? poster.createFacebookStoryVideoMedia(media)
					: poster.createFacebookStoryPhotoMedia(media)
		};
	}
	if (post.postType === 'post') {
		return {
			kind: 'call',
			run: () =>
				video
					? poster.createInstagramReelContainer(media, post.textContent)
					: poster.createInstagramImageContainer(media, post.textContent)
		};
	}
	return {
		kind: 'call',
		run: () =>
			video
				? poster.createInstagramStoryVideoContainer(media)
				: poster.createInstagramStoryPhotoContainer(media)
	};
}

/**
 * Phase 2 (legacy `publishPosts`): the call that publishes a post, returning its post id (null for
 * a Facebook video post, which legacy never supported and marked published anyway). Stories and
 * Instagram posts publish what phase 1 prepared; without it the post fails (legacy crashed).
 */
export function publishCall(
	post: SocialPost,
	poster: SocialPoster
): { kind: 'call'; run: () => Promise<string | null> } | { kind: 'error'; message: string } {
	const prepared = post.mediaExternalId;
	const notPrepared = {
		kind: 'error',
		message: 'The media was not prepared before the publication time'
	} as const;

	if (post.platform === 'instagram') {
		if (!prepared) return notPrepared;
		return { kind: 'call', run: () => poster.publishInstagramContainer(prepared) };
	}
	if (post.postType === 'story') {
		if (post.postContentType === 'text')
			return { kind: 'error', message: 'Invalid post content type: text' };
		if (!prepared) return notPrepared;
		return {
			kind: 'call',
			run: () =>
				post.postContentType === 'video'
					? poster.publishFacebookStoryVideo(prepared)
					: poster.publishFacebookStoryPhoto(prepared)
		};
	}
	if (post.postContentType === 'text') {
		const { message, link } = splitLink(post.textContent);
		return { kind: 'call', run: () => poster.postToFacebookText(message, link) };
	}
	if (post.postContentType === 'image') {
		return {
			kind: 'call',
			run: () => poster.postToFacebookPhoto(post.mediaPath ?? '', post.textContent)
		};
	}
	return { kind: 'call', run: async () => null };
}

/** `error_message` column. */
export const ERROR_LENGTH = 1024;

const NO_ANSWER =
	'No answer from Facebook, not tried again (it may have been posted: check the page before publishing it again)';

/** The Graph API refused the request, so it created nothing (see `GraphError`). */
export const isRejected = (error: unknown) => error instanceof GraphError && error.rejected;

/**
 * What a failed publication changes. Usually only `error_message`: the post stays unpublished, so
 * the next minute tries it again while it is inside the 5-minute window, on Facebook as on
 * Instagram (legacy marked a failed Facebook post published, so it was never tried again). When
 * the media wasn't prepared, the preparation's error is kept: it says why.
 *
 * A Facebook request that got no Graph error back (timeout, dropped connection, gateway error) may
 * have created the post, and sending it again would post it twice: it is marked done, published
 * without a `post_id` (the admin shows it as failed, with retry). Instagram publishes a prepared
 * container, which can't be published twice, so it is always tried again.
 */
export function publishFailure(
	post: { platform: SocialPost['platform']; errorMessage: string | null },
	failure: { message: string; notPrepared: boolean; rejected: boolean }
): { errorMessage: string } | { errorMessage: string; published: true; postId: null } {
	if (failure.notPrepared) {
		return { errorMessage: (post.errorMessage || failure.message).slice(0, ERROR_LENGTH) };
	}
	if (post.platform === 'facebook' && !failure.rejected) {
		return {
			errorMessage: `${NO_ANSWER}: ${failure.message}`.slice(0, ERROR_LENGTH),
			published: true,
			postId: null
		};
	}
	return { errorMessage: failure.message.slice(0, ERROR_LENGTH) };
}
