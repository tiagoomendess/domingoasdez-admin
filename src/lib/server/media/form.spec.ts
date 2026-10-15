import { describe, expect, it } from 'vitest';
import { parseForm } from '#lib/server/forms.ts';
import {
	cleanTags,
	createMediaSchema,
	fileExtension,
	isVideoExtension,
	mediaTypeFromUrl,
	thumbnailLabel,
	updateMediaSchema,
	youtubeId
} from './form';

function formData(entries: Record<string, string | File>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.append(key, value);
	return data;
}

describe('createMediaSchema', () => {
	it('reads an upload', () => {
		const file = new File([new Uint8Array(3)], 'foto.jpg', { type: 'image/jpeg' });
		const result = parseForm(
			createMediaSchema,
			formData({ source: 'file', tags: 'Final', file, visible: 'on' })
		);
		expect(result.success && result.data).toEqual({
			tags: 'Final',
			source: 'file',
			url: null,
			file,
			visible: true
		});
	});

	it('reads a link and checks it', () => {
		const ok = parseForm(
			createMediaSchema,
			formData({ source: 'url', tags: 'Golo', url: 'https://www.youtube.com/watch?v=abc123' })
		);
		expect(ok.success && ok.data.url).toBe('https://www.youtube.com/watch?v=abc123');

		const bad = parseForm(
			createMediaSchema,
			formData({ source: 'url', tags: '', url: 'javascript:alert(1)' })
		);
		expect(!bad.success && Object.keys(bad.errors).sort()).toEqual(['tags', 'url']);
	});

	it('treats an empty file input as no file', () => {
		const result = parseForm(createMediaSchema, formData({ tags: 'x', file: new File([], '') }));
		expect(result.success && result.data).toMatchObject({ source: 'file', file: null });
	});
});

describe('updateMediaSchema', () => {
	it('only takes tags and visibility', () => {
		const result = parseForm(updateMediaSchema, formData({ tags: 'a, b', url: 'ignored' }));
		expect(result.success && result.data).toEqual({ tags: 'a, b', visible: false });
	});
});

describe('legacy typing rules', () => {
	it('types links like legacy, including .jpg', () => {
		expect(mediaTypeFromUrl('https://youtu.be/abc123')).toBe('youtube');
		expect(mediaTypeFromUrl('https://site.pt/foto.JPG')).toBe('image');
		expect(mediaTypeFromUrl('https://site.pt/foto.png?x=1')).toBe('image');
		expect(mediaTypeFromUrl('https://site.pt/video.mp4')).toBe('video');
		expect(mediaTypeFromUrl('https://site.pt/regulamento.pdf')).toBe('other');
	});

	it('cleans extensions and recognises videos', () => {
		expect(fileExtension('Regulamento 2026.PDF')).toBe('pdf');
		expect(fileExtension('sem-extensao')).toBe('bin');
		expect(fileExtension('x.m p4')).toBe('mp4');
		expect(isVideoExtension('mp4')).toBe(true);
		expect(isVideoExtension('mov')).toBe(false);
	});

	it('finds YouTube ids in every link shape', () => {
		expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1')).toBe('dQw4w9WgXcQ');
		expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
		expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
		expect(youtubeId('https://www.youtube.com/channel/x')).toBeNull();
	});

	it('labels generic thumbnails with the end of the URL', () => {
		expect(thumbnailLabel('/storage/media/files/abc.pdf')).toBe('PDF');
		expect(thumbnailLabel('/storage/media/videos/abc.mp4')).toBe('MP4');
		expect(thumbnailLabel('https://site.pt/')).toBe('URL');
	});

	it('removes the space after commas in tags', () => {
		expect(cleanTags('Final, Taça,Barcelos')).toBe('Final,Taça,Barcelos');
	});
});
