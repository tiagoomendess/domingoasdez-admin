import { and, eq, like, ne, or, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { pages } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { mediaUrl } from '#lib/server/media.ts';

export type Page = typeof pages.$inferSelect;

export const PAGE_SORTS = ['id', 'title', 'name', 'created_at', 'updated_at'] as const;

/** Title, name or slug, or the id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const text = or(like(pages.title, pattern), like(pages.name, pattern), like(pages.slug, pattern));
	const id = searchId(q);
	return id ? or(eq(pages.id, id), text) : text;
}

export async function listPages(url: URL) {
	const params = parseListParams(url, PAGE_SORTS, { sort: 'id', dir: 'desc' });
	const where = searchWhere(params.q);
	const state = listState(params, await db.$count(pages, where));

	const sortColumn = {
		id: pages.id,
		title: pages.title,
		name: pages.name,
		created_at: pages.createdAt,
		updated_at: pages.updatedAt
	}[params.sort];

	const rows = await db
		.select({
			id: pages.id,
			name: pages.name,
			title: pages.title,
			slug: pages.slug,
			picture: pages.picture,
			visible: pages.visible,
			createdAt: pages.createdAt,
			updatedAt: pages.updatedAt
		})
		.from(pages)
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(pages.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return { rows: rows.map((row) => ({ ...row, picture: mediaUrl(row.picture) })), list: state };
}

export async function findPage(id: number): Promise<Page | undefined> {
	const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
	return page;
}

/** `pages_slug_unique`: legacy never checked it, so a repeated title failed in SQL. */
export async function isSlugTaken(slug: string, exceptId?: number): Promise<boolean> {
	const [row] = await db
		.select({ id: pages.id })
		.from(pages)
		.where(exceptId ? and(eq(pages.slug, slug), ne(pages.id, exceptId)) : eq(pages.slug, slug))
		.limit(1);
	return Boolean(row);
}
