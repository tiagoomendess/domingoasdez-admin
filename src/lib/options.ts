/**
 * Options of the searchable related-entity selects (`SearchSelect.svelte`), served by
 * `GET /api/options/<entity>?q=<text>&page=<n>`.
 */

/** Results per request; the select loads the next page when the list is scrolled to the end. */
export const OPTIONS_PAGE_SIZE = 20;

export type Option = {
	value: number | string;
	label: string;
	/** Second line (e.g. a user's email). */
	description?: string | null;
	/** Absolute image URL (emblem, photo). */
	image?: string | null;
};

export type OptionsPage = {
	items: Option[];
	hasMore: boolean;
};
