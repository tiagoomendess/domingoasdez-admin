import { asc, desc, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { PAGE_SIZE, type ListState, type SortDirection } from '#lib/list.ts';

/**
 * Query helpers for list pages and option endpoints. Pure (no DB connection), so they can be
 * unit tested; the queries themselves live with each section.
 */

/** Longest search text accepted from the URL. */
export const MAX_SEARCH_LENGTH = 100;
/** Deep pages are never useful in the admin and cost a big OFFSET. */
const MAX_PAGE = 10_000;

export type ListParams<Sort extends string = string> = {
	q: string;
	sort: Sort;
	dir: SortDirection;
	page: number;
};

export function parseSearch(value: string | null): string {
	return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_SEARCH_LENGTH);
}

export function parsePage(value: string | null): number {
	if (!value || !/^\d{1,6}$/.test(value)) return 1;
	return Math.min(MAX_PAGE, Math.max(1, Number(value)));
}

/**
 * Reads `?q=&sort=&dir=&page=`. Unknown sort columns fall back to the default, so the column
 * name never reaches SQL unchecked.
 */
export function parseListParams<Sort extends string>(
	url: URL,
	sorts: readonly Sort[],
	defaults: { sort: Sort; dir: SortDirection }
): ListParams<Sort> {
	const requested = url.searchParams.get('sort');
	const sort = sorts.find((column) => column === requested) ?? defaults.sort;
	const dirParam = url.searchParams.get('dir');
	const dir: SortDirection =
		dirParam === 'asc' || dirParam === 'desc'
			? dirParam
			: sort === defaults.sort
				? defaults.dir
				: 'asc';

	return {
		q: parseSearch(url.searchParams.get('q')),
		sort,
		dir,
		page: parsePage(url.searchParams.get('page'))
	};
}

/** Clamps the page to the last one and returns what the page needs to render the list. */
export function listState(params: ListParams, total: number, pageSize = PAGE_SIZE): ListState {
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	return {
		q: params.q,
		sort: params.sort,
		dir: params.dir,
		page: Math.min(params.page, pageCount),
		pageCount,
		total,
		pageSize
	};
}

export function pageOffset(state: Pick<ListState, 'page' | 'pageSize'>): number {
	return (state.page - 1) * state.pageSize;
}

/** Escapes `%`, `_` and `\` so user text is matched literally by LIKE. */
export function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export const containsPattern = (value: string) => `%${escapeLike(value)}%`;
export const prefixPattern = (value: string) => `${escapeLike(value)}%`;

/** The search text as a row id (`#12` or `12`), or null. */
export function searchId(q: string): number | null {
	const match = /^#?(\d{1,10})$/.exec(q);
	if (!match) return null;
	const id = Number(match[1]);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function orderBy(column: AnyColumn | SQL, dir: SortDirection): SQL {
	return dir === 'asc' ? asc(column) : desc(column);
}

/** Sorts exact matches first, then prefix matches, then the rest (for option searches). */
export function relevance(column: AnyColumn, q: string): SQL {
	return sql`CASE WHEN ${column} = ${q} THEN 0 WHEN ${column} LIKE ${prefixPattern(q)} THEN 1 ELSE 2 END`;
}
