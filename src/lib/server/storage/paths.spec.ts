import { describe, expect, it } from 'vitest';
import {
	CACHE_IMMUTABLE,
	CACHE_SHORT,
	STORAGE_FOLDERS,
	cacheControlFor,
	isStoredUrl,
	newStorageUrl,
	storageKey
} from './paths';

describe('storage paths', () => {
	it('names new files with a uuid inside the folder, like the legacy site', () => {
		const url = newStorageUrl(STORAGE_FOLDERS.mediaImages, '.JPG');
		expect(url).toMatch(/^\/storage\/media\/images\/[0-9a-f-]{36}\.jpg$/);
		expect(newStorageUrl('/storage/clubs/', 'png')).toMatch(
			/^\/storage\/clubs\/[0-9a-f-]{36}\.png$/
		);
	});

	it('refuses folders outside /storage and odd extensions', () => {
		expect(() => newStorageUrl('/images', 'jpg')).toThrow();
		expect(() => newStorageUrl('/storage/media', 'php?x')).toThrow();
	});

	it('maps DB paths to R2 keys', () => {
		expect(storageKey('/storage/media/images/a.jpg')).toBe('storage/media/images/a.jpg');
		expect(() => storageKey('/images/logo.png')).toThrow();
		expect(() => storageKey('/storage/../.env')).toThrow();
		expect(() => storageKey('/storage//x.jpg')).toThrow();
	});

	it('recognises stored files', () => {
		expect(isStoredUrl('/storage/media/a.jpg')).toBe(true);
		expect(isStoredUrl('https://youtube.com/watch?v=1')).toBe(false);
		expect(isStoredUrl(null)).toBe(false);
	});

	it('caches uuid-named files forever and /storage/tmp briefly', () => {
		expect(cacheControlFor('/storage/media/images/a.jpg')).toBe(CACHE_IMMUTABLE);
		expect(cacheControlFor('/storage/tmp/game-12.jpg')).toBe(CACHE_SHORT);
	});
});
