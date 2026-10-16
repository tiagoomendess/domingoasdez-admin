import { and, eq, like, ne, or, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { deleteFile } from '#lib/server/storage/index.ts';
import {
	articles,
	clubs,
	competitions,
	games,
	media,
	mediaTypes,
	pages,
	partners,
	players,
	playgrounds,
	polls,
	referees,
	seasons,
	teamAgents,
	userProfiles,
	users
} from '#lib/server/db/schema.ts';
import {
	containsPattern,
	escapeLike,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { mediaThumbnail } from '#lib/server/articles/index.ts';
import type { MediaType } from './form';

export type Media = typeof media.$inferSelect;

export const MEDIA_SORTS = ['id', 'tags', 'media_type', 'created_at'] as const;

/** `?type=` filter of the list (legacy search by "Tipo de Multimédia"). */
export function parseTypeFilter(url: URL): MediaType | null {
	const value = url.searchParams.get('type');
	return (mediaTypes as readonly string[]).includes(value ?? '') ? (value as MediaType) : null;
}

/** Tags contain the text, or the id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const byTags = like(media.tags, containsPattern(q));
	const id = searchId(q);
	return id ? or(eq(media.id, id), byTags) : byTags;
}

export async function listMedia(url: URL) {
	const params = parseListParams(url, MEDIA_SORTS, { sort: 'id', dir: 'desc' });
	const type = parseTypeFilter(url);
	const where = and(searchWhere(params.q), type ? eq(media.mediaType, type) : undefined);
	const state = listState(params, await db.$count(media, where));

	const sortColumn = {
		id: media.id,
		tags: media.tags,
		media_type: media.mediaType,
		created_at: media.createdAt
	}[params.sort];

	const rows = await db
		.select({
			id: media.id,
			url: media.url,
			thumbnailUrl: media.thumbnailUrl,
			mediaType: media.mediaType,
			tags: media.tags,
			visible: media.visible,
			createdAt: media.createdAt,
			author: users.name
		})
		.from(media)
		.leftJoin(users, eq(users.id, media.userId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(media.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map(({ thumbnailUrl, ...row }) => ({
			...row,
			thumbnail: mediaThumbnail({ ...row, thumbnailUrl })
		})),
		list: state,
		type
	};
}

export async function findMedia(id: number): Promise<Media | undefined> {
	const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
	return item;
}

/** Columns that store upload paths: a file they show is kept when its media item is deleted. */
const PATH_COLUMNS = [
	['clubs', clubs.emblem],
	['competitions', competitions.picture],
	['games', games.image],
	['pages', pages.picture],
	['partners', partners.picture],
	['players', players.picture],
	['playgrounds', playgrounds.picture],
	['polls', polls.image],
	['referees', referees.picture],
	['seasons', seasons.picture],
	['team_agents', teamAgents.picture],
	['user_profiles', userProfiles.picture]
] as const;

export type MediaUsage = {
	/** Articles whose cover is this item (they lose the cover). */
	covers: number;
	/** Articles and pages whose text shows the file. */
	texts: number;
	/** Other records showing the same file (other media items included), by table. */
	records: { table: string; count: number }[];
};

/** Where a media item is used. Only stored files (`/storage/...`) can be shared by path. */
export async function mediaUsage(item: Pick<Media, 'id' | 'url'>): Promise<MediaUsage> {
	const covers = db.$count(articles, eq(articles.mediaId, item.id));
	if (!item.url.startsWith('/storage/')) return { covers: await covers, texts: 0, records: [] };

	const inText = `%${escapeLike(item.url)}%`;
	const [coverCount, articleTexts, pageTexts, otherMedia, ...counts] = await Promise.all([
		covers,
		db.$count(articles, like(articles.text, inText)),
		db.$count(pages, like(pages.body, inText)),
		db.$count(media, and(eq(media.url, item.url), ne(media.id, item.id))),
		...PATH_COLUMNS.map(([, column]) => db.$count(column.table, eq(column, item.url)))
	]);
	return {
		covers: coverCount,
		texts: articleTexts + pageTexts,
		records: [
			{ table: 'media', count: otherMedia },
			...PATH_COLUMNS.map(([table], index) => ({ table, count: counts[index] }))
		].filter((entry) => entry.count > 0)
	};
}

/** Uses that keep the file when the media item is deleted (covers just lose the item). */
export function fileInUse(usage: MediaUsage): number {
	return usage.texts + usage.records.reduce((sum, entry) => sum + entry.count, 0);
}

export async function uploaderName(userId: number): Promise<string | null> {
	const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
	return user?.name ?? null;
}

/**
 * Deletes a stored file that was just replaced, unless anything still shows it: a media library
 * row (every legacy upload has one), another record's picture column or an article/page text.
 * Call it after the row that used the file points elsewhere. Never throws.
 */
export async function deleteFileIfUnused(url: string | null | undefined): Promise<void> {
	if (!url?.startsWith('/storage/')) return;
	try {
		if (fileInUse(await mediaUsage({ id: 0, url })) === 0) await deleteFile(url);
	} catch (error) {
		console.warn('[media] could not clean up a replaced file:', error);
	}
}
