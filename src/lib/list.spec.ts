import { describe, expect, it } from 'vitest';
import { listHref, pageRange, pageWindow, sortHref } from './list';

const url = new URL('http://admin.test/clubs?q=benfica&sort=name&dir=asc&page=3');

describe('listHref', () => {
	it('changes some parameters and keeps the others', () => {
		expect(listHref(url, { page: 4 })).toBe('/clubs?q=benfica&sort=name&dir=asc&page=4');
	});

	it('removes parameters set to null or empty', () => {
		expect(listHref(url, { q: '', page: null })).toBe('/clubs?sort=name&dir=asc');
		expect(listHref(new URL('http://admin.test/clubs?page=2'), { page: null })).toBe('/clubs');
	});

	it('encodes search text', () => {
		expect(listHref(new URL('http://admin.test/teams'), { q: 'São João & Cª' })).toBe(
			'/teams?q=S%C3%A3o+Jo%C3%A3o+%26+C%C2%AA'
		);
	});
});

describe('sortHref', () => {
	it('sorts by a new column in its default direction, back on the first page', () => {
		expect(sortHref(url, { sort: 'name', dir: 'asc' }, 'updated_at', 'desc')).toBe(
			'/clubs?q=benfica&sort=updated_at&dir=desc'
		);
	});

	it('flips the direction of the current column', () => {
		expect(sortHref(url, { sort: 'name', dir: 'asc' }, 'name')).toBe(
			'/clubs?q=benfica&sort=name&dir=desc'
		);
		expect(sortHref(url, { sort: 'name', dir: 'desc' }, 'name')).toBe(
			'/clubs?q=benfica&sort=name&dir=asc'
		);
	});
});

describe('pageWindow', () => {
	it('lists every page when there are few', () => {
		expect(pageWindow(1, 1)).toEqual([1]);
		expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
		expect(pageWindow(1, 0)).toEqual([]);
	});

	it('shows the ends and the neighbours of the current page, with gaps', () => {
		expect(pageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
		expect(pageWindow(1, 20)).toEqual([1, 2, null, 20]);
		expect(pageWindow(20, 20)).toEqual([1, null, 19, 20]);
	});

	it('fills a gap of a single page instead of showing "…"', () => {
		expect(pageWindow(4, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
	});
});

describe('pageRange', () => {
	it('returns the rows shown on the page', () => {
		expect(pageRange({ page: 1, pageSize: 25, total: 60 })).toEqual({ from: 1, to: 25 });
		expect(pageRange({ page: 3, pageSize: 25, total: 60 })).toEqual({ from: 51, to: 60 });
		expect(pageRange({ page: 1, pageSize: 25, total: 0 })).toEqual({ from: 0, to: 0 });
	});
});
