import { OPTIONS_PAGE_SIZE, type Option, type OptionsPage } from '#lib/options.ts';
import { parsePage, parseSearch } from './list';

export type OptionsQuery = {
	q: string;
	page: number;
	/** One more row than a page, to know whether there is a next one. */
	limit: number;
	offset: number;
};

/** Reads `?q=&page=` of an option endpoint. */
export function parseOptionsQuery(url: URL): OptionsQuery {
	const page = parsePage(url.searchParams.get('page'));
	return {
		q: parseSearch(url.searchParams.get('q')),
		page,
		limit: OPTIONS_PAGE_SIZE + 1,
		offset: (page - 1) * OPTIONS_PAGE_SIZE
	};
}

/** Turns the rows fetched with `limit` (page size + 1) into the endpoint response. */
export function toOptionsPage<Row>(rows: Row[], toOption: (row: Row) => Option): OptionsPage {
	return {
		items: rows.slice(0, OPTIONS_PAGE_SIZE).map(toOption),
		hasMore: rows.length > OPTIONS_PAGE_SIZE
	};
}
