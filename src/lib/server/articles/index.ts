import { and, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { db } from '#lib/server/db/index.ts';
import { articles, media, users } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { mediaUrl } from '#lib/server/media.ts';
import type { OptionsQuery } from '#lib/server/options.ts';
import { slugify } from '#lib/slug.ts';

export type Article = typeof articles.$inferSelect;
type Media = typeof media.$inferSelect;

export const ARTICLE_SORTS = ['id', 'title', 'date', 'updated_at'] as const;

/** Article title, or its id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const byTitle = like(articles.title, containsPattern(q));
	const id = searchId(q);
	return id ? or(eq(articles.id, id), byTitle) : byTitle;
}

export async function listArticles(url: URL) {
	const params = parseListParams(url, ARTICLE_SORTS, { sort: 'id', dir: 'desc' });
	const where = searchWhere(params.q);
	const state = listState(params, await db.$count(articles, where));

	const sortColumn = {
		id: articles.id,
		title: articles.title,
		date: articles.date,
		updated_at: articles.updatedAt
	}[params.sort];

	const rows = await db
		.select({
			id: articles.id,
			title: articles.title,
			date: articles.date,
			visible: articles.visible,
			facebookPostId: articles.facebookPostId,
			updatedAt: articles.updatedAt,
			author: users.name,
			cover: media
		})
		.from(articles)
		.leftJoin(users, eq(users.id, articles.userId))
		.leftJoin(media, eq(media.id, articles.mediaId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(articles.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map(({ cover, date, facebookPostId, ...row }) => ({
			...row,
			date: date.toISOString().slice(0, 10),
			facebookPostUrl: facebookPostUrl(facebookPostId),
			cover: cover ? mediaThumbnail(cover) : null
		})),
		list: state
	};
}

export async function findArticle(id: number): Promise<Article | undefined> {
	const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
	return article;
}

export async function authorName(userId: number): Promise<string | null> {
	const [user] = await db
		.select({ name: users.name })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	return user?.name ?? null;
}

/**
 * The article on the public site (`domingoasdez-app` `articleHref`, legacy `getPublicUrl()`):
 * `/noticias/<yyyy>/<mm>/<dd>/<slug of the title>`, the date's UTC calendar day.
 */
export function articlePath(article: Pick<Article, 'date' | 'title'>) {
	const [year, month, day] = article.date.toISOString().slice(0, 10).split('-');
	return `/noticias/${year}/${month}/${day}/${slugify(article.title)}`;
}

/** The article's post on Facebook: page post ids (`<page>_<post>`) open it. */
export const facebookPostUrl = (postId: string | null) =>
	postId ? `https://www.facebook.com/${encodeURIComponent(postId)}` : null;

/** Display URL of a media item's picture: its thumbnail, or the image itself. */
export function mediaThumbnail(item: Pick<Media, 'url' | 'thumbnailUrl' | 'mediaType'>) {
	return mediaUrl(item.thumbnailUrl) ?? (item.mediaType === 'image' ? mediaUrl(item.url) : null);
}

export function mediaOption(
	item: Pick<Media, 'id' | 'url' | 'thumbnailUrl' | 'mediaType' | 'tags'>
) {
	const tags = item.tags?.replaceAll(',', ', ').trim();
	return {
		value: item.id,
		label: tags || `#${item.id}`,
		description: `#${item.id} · ${item.mediaType}`,
		image: mediaThumbnail(item) ?? undefined
	} satisfies Option;
}

const mediaOptionColumns = {
	id: media.id,
	url: media.url,
	thumbnailUrl: media.thumbnailUrl,
	mediaType: media.mediaType,
	tags: media.tags
};

/** Legacy only accepts visible media as an article cover. */
export async function findCoverMedia(id: number | null | undefined) {
	if (!id) return null;
	const [item] = await db
		.select(mediaOptionColumns)
		.from(media)
		.where(and(eq(media.id, id), eq(media.visible, true)))
		.limit(1);
	return item ?? null;
}

/** Cover options: visible media whose tags contain the text (or the id), newest first. */
export async function searchCoverOptions({ q, limit, offset }: OptionsQuery) {
	let where: SQL | undefined = eq(media.visible, true);
	if (q) {
		const id = searchId(q);
		where = and(where, or(like(media.tags, containsPattern(q)), id ? eq(media.id, id) : undefined));
	}
	return db
		.select(mediaOptionColumns)
		.from(media)
		.where(where)
		.orderBy(desc(media.id))
		.limit(limit)
		.offset(offset);
}
