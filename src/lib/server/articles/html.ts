import DOMPurify from 'isomorphic-dompurify';

/**
 * Article bodies are HTML written in the editor (legacy CKEditor 4, now Tiptap) and rendered raw
 * by the legacy site (`{!! $article->text !!}`), so they are sanitised before they are stored,
 * with the rules `domingoasdez-app` uses to render them.
 */
export function sanitizeArticleHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true },
		ADD_TAGS: ['video', 'source'],
		ADD_ATTR: [
			'target',
			'controls',
			'autoplay',
			'loop',
			'muted',
			'playsinline',
			'preload',
			'poster',
			'width',
			'height',
			'border',
			'cellpadding',
			'cellspacing',
			'align'
		]
	});
}

/** The editor always keeps an empty paragraph at the end; it is not stored. */
export function trimTrailingEmptyParagraphs(html: string): string {
	return html.replace(/(?:\s*<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>)+\s*$/i, '');
}

const ATTRIBUTE_URL = /\b(src|href|poster)=(["'])\s*([^"']*?)\s*\2/gi;

/**
 * Stored bodies reference uploads by path (`/storage/...`, like the legacy editor wrote them) so
 * they follow the CDN switch. The editor runs on the admin origin, which serves no uploads:
 * `toDisplay` turns those paths into loadable URLs (`mediaUrl()`), `toStoredHtml` undoes it.
 */
export function toEditorHtml(html: string, toDisplay: (path: string) => string | null): string {
	return html.replace(ATTRIBUTE_URL, (match, attr: string, quote: string, url: string) => {
		if (!url.startsWith('/storage/') && !url.startsWith('/images/')) return match;
		return `${attr}=${quote}${toDisplay(url) ?? url}${quote}`;
	});
}

/** Inverse of `toEditorHtml`: URLs under one of the media `origins` go back to paths. */
export function toStoredHtml(
	html: string,
	origins: readonly (string | null | undefined)[]
): string {
	const bases = origins.filter((origin): origin is string => Boolean(origin)).map(trimSlash);
	return html.replace(ATTRIBUTE_URL, (match, attr: string, quote: string, url: string) => {
		const base = bases.find((origin) => url.startsWith(`${origin}/`));
		if (!base) return match;
		const path = url.slice(base.length);
		if (!path.startsWith('/storage/') && !path.startsWith('/images/')) return match;
		return `${attr}=${quote}${path}${quote}`;
	});
}

const trimSlash = (value: string) => value.replace(/\/+$/, '');

/** Legacy summary length: `substr(strip_tags($text), 0, 270) . '...'`. */
export const SUMMARY_LENGTH = 270;

/**
 * The description the legacy controller generates when none is given: the first 270 characters
 * of the text without tags, plus `...`. Legacy cut bytes (`substr`), which could split an
 * accented letter and store invalid UTF-8; this cuts characters. Entities are decoded and
 * paragraphs separated by a space, since the description is plain text.
 */
export function summarizeArticle(html: string): string {
	const blocks = html.replace(/<\/(p|h[1-6]|li|div|blockquote|tr|td|th)>|<br\s*\/?>/gi, '$& ');
	const fragment = DOMPurify.sanitize(blocks, { RETURN_DOM_FRAGMENT: true });
	const text = (fragment.textContent ?? '').replace(/\s+/g, ' ').trim();
	return `${Array.from(text).slice(0, SUMMARY_LENGTH).join('')}...`;
}
