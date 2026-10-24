import { describe, expect, it } from 'vitest';
import { expiredFiles } from './cleanup-tmp-folder.rules.ts';

const now = new Date('2026-10-25T04:00:00Z');
const file = (name: string, iso: string | null) => ({
	url: `/storage/tmp/${name}`,
	lastModified: iso ? new Date(iso) : null
});

describe('expiredFiles', () => {
	it('picks files older than 3 days', () => {
		const files = [
			file('old.jpg', '2026-10-22T03:59:59Z'),
			file('edge.jpg', '2026-10-22T04:00:00Z'),
			file('new.jpg', '2026-10-24T20:00:00Z')
		];
		expect(expiredFiles(files, now).map((f) => f.url)).toEqual(['/storage/tmp/old.jpg']);
	});

	it('keeps .gitkeep and files without a date', () => {
		const files = [file('.gitkeep', '2020-01-01T00:00:00Z'), file('unknown.jpg', null)];
		expect(expiredFiles(files, now)).toEqual([]);
	});
});
