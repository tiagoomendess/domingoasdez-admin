import { and, eq, gte, isNotNull, isNull, like, lt, or, sql, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { socialMediaPosts } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import {
	parsePlatformFilter,
	parseStatusFilter,
	postStatus,
	PUBLISH_LATE_MS,
	type PostStatusFilter
} from './form';

export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;

export const POST_SORTS = ['id', 'publish_at'] as const;

function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const id = searchId(q);
	return or(
		like(socialMediaPosts.textContent, pattern),
		like(socialMediaPosts.mediaPath, pattern),
		id ? eq(socialMediaPosts.id, id) : undefined
	);
}

/** Same rules as `postStatus()`, in SQL. */
function statusWhere(status: PostStatusFilter | null, now: Date): SQL | undefined {
	const late = new Date(now.getTime() - PUBLISH_LATE_MS);
	const noError = isNull(socialMediaPosts.errorMessage);
	const notPublished = or(eq(socialMediaPosts.published, false), isNull(socialMediaPosts.postId));
	switch (status) {
		case 'published':
			return and(
				eq(socialMediaPosts.published, true),
				or(isNotNull(socialMediaPosts.postId), noError)
			);
		case 'failed':
			return and(isNotNull(socialMediaPosts.errorMessage), notPublished);
		case 'missed':
			return and(
				eq(socialMediaPosts.published, false),
				noError,
				lt(socialMediaPosts.publishAt, late)
			);
		case 'pending':
			return and(
				eq(socialMediaPosts.published, false),
				noError,
				gte(socialMediaPosts.publishAt, late)
			);
		default:
			return undefined;
	}
}

/** Newest publication time first by default: the upcoming and recent posts. */
export async function listPosts(url: URL, now = new Date()) {
	const params = parseListParams(url, POST_SORTS, { sort: 'publish_at', dir: 'desc' });
	const status = parseStatusFilter(url);
	const platform = parsePlatformFilter(url);
	const where = and(
		searchWhere(params.q),
		statusWhere(status, now),
		platform ? eq(socialMediaPosts.platform, platform) : undefined
	);

	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(socialMediaPosts)
		.where(where);
	const state = listState(params, total);
	const sortColumn = { id: socialMediaPosts.id, publish_at: socialMediaPosts.publishAt }[
		params.sort
	];

	const rows = await db
		.select()
		.from(socialMediaPosts)
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(socialMediaPosts.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({ ...row, status: postStatus(row, now) })),
		list: state,
		status,
		platform
	};
}

export async function findPost(id: number): Promise<SocialMediaPost | undefined> {
	const [post] = await db
		.select()
		.from(socialMediaPosts)
		.where(eq(socialMediaPosts.id, id))
		.limit(1);
	return post;
}
