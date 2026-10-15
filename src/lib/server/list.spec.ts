import { describe, expect, it } from 'vitest';
import {
	containsPattern,
	escapeLike,
	listState,
	pageOffset,
	parseListParams,
	parsePage,
	parseSearch,
	prefixPattern,
	searchId
} from './list';

const SORTS = ['id', 'name', 'updated_at'] as const;
const DEFAULTS = { sort: 'id', dir: 'desc' } as const;
const params = (search: string) =>
	parseListParams(new URL(`http://admin.test/clubs${search}`), SORTS, DEFAULTS);

describe('parseListParams', () => {
	it('uses the defaults without parameters', () => {
		expect(params('')).toEqual({ q: '', sort: 'id', dir: 'desc', page: 1 });
	});

	it('reads search, sort, direction and page', () => {
		expect(params('?q=%20Benfica%20%20B%20&sort=name&dir=desc&page=4')).toEqual({
			q: 'Benfica B',
			sort: 'name',
			dir: 'desc',
			page: 4
		});
	});

	it('never lets an unknown column through', () => {
		expect(params('?sort=password&dir=asc').sort).toBe('id');
		expect(params('?sort=name;DROP TABLE clubs').sort).toBe('id');
	});

	it('sorts other columns ascending unless told otherwise', () => {
		expect(params('?sort=name').dir).toBe('asc');
		expect(params('?dir=sideways').dir).toBe('desc');
	});
});

describe('parsePage', () => {
	it('accepts positive integers only', () => {
		expect(parsePage('7')).toBe(7);
		expect(parsePage('0')).toBe(1);
		expect(parsePage('-2')).toBe(1);
		expect(parsePage('2.5')).toBe(1);
		expect(parsePage('abc')).toBe(1);
		expect(parsePage(null)).toBe(1);
		expect(parsePage('999999')).toBe(10_000);
	});
});

describe('parseSearch', () => {
	it('trims, collapses spaces and caps the length', () => {
		expect(parseSearch('  a   b ')).toBe('a b');
		expect(parseSearch('x'.repeat(500))).toHaveLength(100);
		expect(parseSearch(null)).toBe('');
	});
});

describe('listState', () => {
	it('counts pages and clamps the page to the last one', () => {
		const state = listState({ q: '', sort: 'id', dir: 'desc', page: 9 }, 60);
		expect(state).toMatchObject({ page: 3, pageCount: 3, total: 60, pageSize: 25 });
		expect(pageOffset(state)).toBe(50);
	});

	it('has one (empty) page without rows', () => {
		expect(listState({ q: 'x', sort: 'id', dir: 'desc', page: 2 }, 0)).toMatchObject({
			page: 1,
			pageCount: 1
		});
	});
});

describe('LIKE patterns', () => {
	it('match user text literally', () => {
		expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
		expect(containsPattern('50%')).toBe('%50\\%%');
		expect(prefixPattern('a_b')).toBe('a\\_b%');
	});
});

describe('searchId', () => {
	it('reads an id typed as 12 or #12', () => {
		expect(searchId('12')).toBe(12);
		expect(searchId('#12')).toBe(12);
		expect(searchId('0')).toBeNull();
		expect(searchId('12a')).toBeNull();
		expect(searchId('Benfica')).toBeNull();
		expect(searchId('')).toBeNull();
	});
});
