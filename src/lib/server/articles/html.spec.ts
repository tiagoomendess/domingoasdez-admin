import { describe, expect, it } from 'vitest';
import {
	sanitizeArticleHtml,
	summarizeArticle,
	toEditorHtml,
	toStoredHtml,
	trimTrailingEmptyParagraphs
} from './html';

const display = (path: string) => `https://cdn.example${path}`;
const origins = ['http://localhost:8000', 'https://cdn.example/', null];

describe('sanitizeArticleHtml', () => {
	it('keeps the legacy formatting and strips scripts', () => {
		const html =
			'<p style="text-align:justify">Olá <strong>mundo</strong></p><script>alert(1)</script>' +
			'<img src="/storage/media/images/a.jpg" onerror="alert(1)"><video controls src="/storage/v.mp4"></video>';
		const out = sanitizeArticleHtml(html);
		expect(out).toContain('<p style="text-align:justify">Olá <strong>mundo</strong></p>');
		expect(out).toContain('<img src="/storage/media/images/a.jpg">');
		expect(out).toContain('<video controls="" src="/storage/v.mp4"></video>');
		expect(out).not.toContain('script');
		expect(out).not.toContain('onerror');
	});

	it('removes javascript: links', () => {
		expect(sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
	});
});

describe('editor URLs', () => {
	it('shows stored upload paths from the media origin', () => {
		const html =
			'<img src="/storage/a.jpg"><a href="/storage/f.pdf">f</a><a href="/noticias">n</a>';
		expect(toEditorHtml(html, display)).toBe(
			'<img src="https://cdn.example/storage/a.jpg"><a href="https://cdn.example/storage/f.pdf">f</a><a href="/noticias">n</a>'
		);
	});

	it('stores media URLs back as paths and leaves other links alone', () => {
		const html =
			'<img src="https://cdn.example/storage/a.jpg"><img src="http://localhost:8000/images/x.png">' +
			'<a href="https://cdn.example/outro">o</a><img src="https://elsewhere.pt/storage/b.jpg">';
		expect(toStoredHtml(html, origins)).toBe(
			'<img src="/storage/a.jpg"><img src="/images/x.png">' +
				'<a href="https://cdn.example/outro">o</a><img src="https://elsewhere.pt/storage/b.jpg">'
		);
	});

	it('round-trips', () => {
		const stored = '<p><img src="/storage/media/images/a.jpg" style="width:100%"></p>';
		expect(toStoredHtml(toEditorHtml(stored, display), origins)).toBe(stored);
	});
});

describe('summarizeArticle', () => {
	it('takes the first 270 characters of the text, like legacy', () => {
		const out = summarizeArticle(`<p>${'á'.repeat(300)}</p>`);
		expect(out).toBe(`${'á'.repeat(270)}...`);
	});

	it('separates paragraphs and decodes entities', () => {
		expect(summarizeArticle('<p>Inscri&ccedil;&otilde;es</p><p>abertas&nbsp;hoje</p>')).toBe(
			'Inscrições abertas hoje...'
		);
	});
});

describe('trimTrailingEmptyParagraphs', () => {
	it('drops the empty paragraphs the editor keeps at the end', () => {
		expect(trimTrailingEmptyParagraphs('<p>Texto</p><img src="/a.jpg"><p></p>')).toBe(
			'<p>Texto</p><img src="/a.jpg">'
		);
		expect(trimTrailingEmptyParagraphs('<p>a</p><p><br></p> <p>&nbsp;</p>')).toBe('<p>a</p>');
		expect(trimTrailingEmptyParagraphs('<p></p><p>a</p>')).toBe('<p></p><p>a</p>');
	});
});
