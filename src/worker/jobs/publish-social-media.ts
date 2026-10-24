import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';
import {
	FB_GRAPH_URL,
	FB_GRAPH_VERSION,
	FB_PAGE_ACCESS_TOKEN,
	FB_PAGE_ID,
	FB_SYSTEM_USER_TOKEN,
	IG_USER_ID
} from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { socialMediaPosts } from '#lib/server/db/schema.ts';
import type { JobContext } from '../job.ts';
import { createSocialPoster } from '../social/graph.ts';
import {
	prepareCall,
	PREPARE_AHEAD_MS,
	PREPARE_LATE_MS,
	publishCall,
	ERROR_LENGTH,
	isRejected,
	publishFailure,
	PUBLISH_LATE_MS,
	type SocialPost
} from './publish-social-media.rules.ts';

const columns = {
	id: socialMediaPosts.id,
	platform: socialMediaPosts.platform,
	postType: socialMediaPosts.postType,
	postContentType: socialMediaPosts.postContentType,
	mediaPath: socialMediaPosts.mediaPath,
	textContent: socialMediaPosts.textContent,
	mediaExternalId: socialMediaPosts.mediaExternalId,
	errorMessage: socialMediaPosts.errorMessage
};
const order = [asc(socialMediaPosts.publishAt), asc(socialMediaPosts.id)] as const;

/** The error text, with the cause of a network failure (fetch: "fetch failed (ECONNRESET)"). */
function message(error: unknown) {
	if (!(error instanceof Error)) return String(error).slice(0, ERROR_LENGTH);
	const cause = error.cause as { code?: string; message?: string } | undefined;
	const detail = cause?.code ?? cause?.message;
	return (detail ? `${error.message} (${detail})` : error.message).slice(0, ERROR_LENGTH);
}

const describe = (post: SocialPost) =>
	`post #${post.id} (${post.platform} ${post.postType} ${post.postContentType})`;

/**
 * Legacy `PublishSocialMedia` (every minute), the job that posts what `schedule-social-media`,
 * `club-birthdays`, `player-goal-milestones` and the admin's Social media section schedule:
 *
 * 1. Prepare: posts due within 15 minutes (up to 1 minute late) whose media isn't uploaded yet:
 *    Facebook story photos/videos are uploaded unpublished and Instagram containers created; the
 *    id goes to `media_external_id`, a failure to `error_message` (tried again next minute).
 * 2. Publish: posts due now (up to 5 minutes late; later ones are skipped for good): Instagram and
 *    stories publish what was prepared, Facebook posts are published in one call; the result goes
 *    to `post_id` and `published`. A failure goes to `error_message` and the post stays
 *    unpublished, so it is tried again next minute (`publishFailure()`), except a Facebook request
 *    that got no answer (it may have been posted: marked done, not sent twice). As in legacy, a later
 *    success keeps the earlier error.
 *
 * Dry run (WORKER_DRY_RUN) logs what would be prepared and published and changes nothing.
 */
export async function run({ log, signal, dryRun }: JobContext) {
	const now = Date.now();
	const poster = createSocialPoster(
		{
			baseUrl: FB_GRAPH_URL,
			version: FB_GRAPH_VERSION,
			pageId: FB_PAGE_ID,
			pageToken: FB_PAGE_ACCESS_TOKEN,
			systemToken: FB_SYSTEM_USER_TOKEN,
			igUserId: IG_USER_ID
		},
		{ log }
	);

	const toPrepare = await db
		.select(columns)
		.from(socialMediaPosts)
		.where(
			and(
				eq(socialMediaPosts.published, false),
				lte(socialMediaPosts.publishAt, new Date(now + PREPARE_AHEAD_MS)),
				gte(socialMediaPosts.publishAt, new Date(now - PREPARE_LATE_MS)),
				isNull(socialMediaPosts.mediaExternalId)
			)
		)
		.orderBy(...order);

	for (const post of toPrepare) {
		if (signal.aborted) return;
		const step = prepareCall(post, poster);
		if (step.kind === 'none') continue;
		if (step.kind === 'invalid') {
			log.error(`${describe(post)}: invalid post content type, not prepared`);
			continue;
		}
		if (dryRun) {
			log.info(`dry run, not prepared: ${describe(post)} ${post.mediaPath ?? ''}`);
			continue;
		}
		try {
			const mediaExternalId = await step.run();
			await db
				.update(socialMediaPosts)
				.set({ mediaExternalId })
				.where(eq(socialMediaPosts.id, post.id));
			log.info(`${describe(post)}: prepared ${mediaExternalId}`);
		} catch (error) {
			log.error(`${describe(post)}: could not prepare the media`, error);
			await db
				.update(socialMediaPosts)
				.set({ errorMessage: message(error) })
				.where(eq(socialMediaPosts.id, post.id));
		}
	}

	// Read again: phase 1 may just have prepared some of them.
	const toPublish = await db
		.select(columns)
		.from(socialMediaPosts)
		.where(
			and(
				eq(socialMediaPosts.published, false),
				lte(socialMediaPosts.publishAt, new Date(now)),
				gte(socialMediaPosts.publishAt, new Date(now - PUBLISH_LATE_MS))
			)
		)
		.orderBy(...order);

	for (const post of toPublish) {
		if (signal.aborted) return;
		if (dryRun) {
			log.info(
				`dry run, not published: ${describe(post)} ${post.mediaPath ?? post.textContent ?? ''}`
			);
			continue;
		}
		const step = publishCall(post, poster);
		try {
			if (step.kind === 'error') throw new Error(step.message);
			const postId = await step.run();
			await db
				.update(socialMediaPosts)
				.set({ postId, published: true })
				.where(eq(socialMediaPosts.id, post.id));
			log.info(`${describe(post)}: published ${postId ?? '(no id)'}`);
		} catch (error) {
			log.error(`${describe(post)}: could not publish`, error);
			await db
				.update(socialMediaPosts)
				.set(
					publishFailure(post, {
						message: message(error),
						notPrepared: step.kind === 'error',
						rejected: isRejected(error)
					})
				)
				.where(eq(socialMediaPosts.id, post.id));
		}
	}
}
