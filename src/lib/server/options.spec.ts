import { describe, expect, it } from 'vitest';
import { OPTIONS_PAGE_SIZE } from '#lib/options.ts';
import { parseOptionsQuery, toOptionsPage } from './options';

describe('parseOptionsQuery', () => {
	it('fetches one row more than a page, to know if there is another', () => {
		expect(parseOptionsQuery(new URL('http://admin.test/api/options/clubs'))).toEqual({
			q: '',
			page: 1,
			limit: OPTIONS_PAGE_SIZE + 1,
			offset: 0
		});
		expect(
			parseOptionsQuery(new URL('http://admin.test/api/options/clubs?q=%20sporting%20&page=3'))
		).toEqual({ q: 'sporting', page: 3, limit: OPTIONS_PAGE_SIZE + 1, offset: 40 });
	});
});

describe('toOptionsPage', () => {
	const rows = (count: number) =>
		Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `Club ${index + 1}` }));
	const toOption = (row: { id: number; name: string }) => ({ value: row.id, label: row.name });

	it('returns a full page and says there is more', () => {
		const page = toOptionsPage(rows(OPTIONS_PAGE_SIZE + 1), toOption);
		expect(page.items).toHaveLength(OPTIONS_PAGE_SIZE);
		expect(page.items[0]).toEqual({ value: 1, label: 'Club 1' });
		expect(page.hasMore).toBe(true);
	});

	it('says there is no more on the last page', () => {
		expect(toOptionsPage(rows(3), toOption)).toEqual({
			items: [
				{ value: 1, label: 'Club 1' },
				{ value: 2, label: 'Club 2' },
				{ value: 3, label: 'Club 3' }
			],
			hasMore: false
		});
	});
});
