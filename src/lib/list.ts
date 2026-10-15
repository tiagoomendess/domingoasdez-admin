import type { ResolvedPathname } from '$app/types';

/**
 * List pages (search, sort, pagination) — the parts shared by the server `load` and the page.
 * Everything lives in the URL query (`?q=&sort=&dir=&page=`), so lists are linkable and work
 * without JavaScript.
 */

/** Rows per list page, like the legacy backoffice (`custom.results_per_page`). */
export const PAGE_SIZE = 25;

export type SortDirection = 'asc' | 'desc';

/** Returned by every list `load` next to its rows; drives the search box, headers and pagination. */
export type ListState = {
	q: string;
	sort: string;
	dir: SortDirection;
	page: number;
	pageCount: number;
	total: number;
	pageSize: number;
};

export type QueryChanges = Record<string, string | number | null | undefined>;

/** `URL` or the read-only `page.url` of `$app/state`. */
export type UrlLike = { pathname: string; searchParams: { toString(): string } };

/**
 * The current page with some query parameters changed (`null`/`''` removes one). The pathname
 * comes from the current URL, which already carries the base path.
 */
export function listHref(url: UrlLike, changes: QueryChanges): ResolvedPathname {
	const params = new URLSearchParams(url.searchParams.toString());
	for (const [key, value] of Object.entries(changes)) {
		if (value === null || value === undefined || value === '') params.delete(key);
		else params.set(key, String(value));
	}
	const search = params.toString();
	return `${url.pathname}${search ? `?${search}` : ''}` as ResolvedPathname;
}

/**
 * Link of a sortable column header: the first click sorts by that column (`defaultDir`), the next
 * one flips the direction. Always goes back to the first page.
 */
export function sortHref(
	url: UrlLike,
	state: Pick<ListState, 'sort' | 'dir'>,
	column: string,
	defaultDir: SortDirection = 'asc'
): ResolvedPathname {
	const dir = state.sort === column ? (state.dir === 'asc' ? 'desc' : 'asc') : defaultDir;
	return listHref(url, { sort: column, dir, page: null });
}

/** Page numbers to show around the current one, with `null` for the gaps: 1 … 4 5 6 … 20 */
export function pageWindow(page: number, pageCount: number, radius = 1): (number | null)[] {
	if (pageCount <= 1) return pageCount === 1 ? [1] : [];

	const pages = new Set([1, pageCount]);
	for (let n = page - radius; n <= page + radius; n++) {
		if (n >= 1 && n <= pageCount) pages.add(n);
	}
	const sorted = [...pages].sort((a, b) => a - b);

	const result: (number | null)[] = [];
	for (const [index, n] of sorted.entries()) {
		const previous = sorted[index - 1];
		if (previous !== undefined && n - previous === 2) result.push(previous + 1);
		else if (previous !== undefined && n - previous > 2) result.push(null);
		result.push(n);
	}
	return result;
}

/** 1-based index of the first and last row shown on the page (0, 0 when empty). */
export function pageRange({
	page,
	pageSize,
	total
}: Pick<ListState, 'page' | 'pageSize' | 'total'>) {
	if (total === 0) return { from: 0, to: 0 };
	const from = (page - 1) * pageSize + 1;
	return { from, to: Math.min(total, from + pageSize - 1) };
}
