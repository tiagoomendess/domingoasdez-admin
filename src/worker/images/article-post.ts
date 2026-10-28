import { loadImage } from '@napi-rs/canvas';
import { decodeImage, drawCenteredText, drawFit, encodeJpeg, FONTS, newCanvas } from './draw.ts';
import { placeholder } from './sources.ts';

/** Legacy `public/images/article_post_base.png` (1080×1350, "Link nos comentários" at the bottom). */
export const ARTICLE_POST_TEMPLATE = '/images/article_post_base.png';

const W = 1080;
const H = 1350;
const TITLE = { x: Math.trunc(W / 2), y: 370, maxWidth: W - 100, size: 50 };
/** 16:9 picture, 50 px from the sides, its bottom 15 % of the height above the bottom edge. */
const PICTURE_WIDTH = W - 100;
const PICTURE_HEIGHT = Math.trunc((PICTURE_WIDTH * 9) / 16);
const PICTURE_Y = H - Math.trunc(H * 0.15) - PICTURE_HEIGHT;

export type ArticlePostInput = {
	/** The bytes of `ARTICLE_POST_TEMPLATE`. */
	template: Uint8Array;
	title: string;
	picture: Uint8Array;
};

/**
 * The picture of legacy `createArticleSocialImage()`: the cover image itself, the thumbnail of a
 * video cover, or the article's 16:9 placeholder without a cover. Legacy generated a missing
 * thumbnail; here a cover without one also gets the placeholder.
 */
export function articlePicturePath(
	articleId: number,
	cover: { mediaType: string; url: string; thumbnailUrl: string | null } | null
): string {
	if (cover?.mediaType === 'image') return cover.url;
	return cover?.thumbnailUrl || placeholder('16_9', articleId);
}

/**
 * Legacy `drawWrappedText()`: words are added to a line while its estimated width (bytes ×
 * 0.6 × font size, PHP `strlen`) fits; a longer word stays whole on its own line.
 */
export function wrapArticleTitle(title: string, maxWidth = TITLE.maxWidth, size = TITLE.size) {
	const lines: string[] = [];
	let line = '';
	for (const word of title.split(' ')) {
		const candidate = line + (line ? ' ' : '') + word;
		if (Buffer.byteLength(candidate) * size * 0.6 <= maxWidth) {
			line = candidate;
		} else {
			if (line) lines.push(line);
			line = word;
		}
	}
	if (line) lines.push(line);
	return lines;
}

/**
 * Legacy `ArticleController::createArticleSocialImage()` (1080×1350), the picture the backoffice
 * posts on Facebook: the template, the title in Roboto Black (white, dark shadow 3 px down-left),
 * centred around y = 370, and the picture cropped to 980×551 near the bottom. JPEG quality 95.
 */
export async function renderArticlePost(input: ArticlePostInput): Promise<Uint8Array> {
	const { canvas, ctx } = newCanvas(W, H);
	ctx.drawImage(await loadImage(Buffer.from(input.template)), 0, 0);

	const lines = wrapArticleTitle(input.title);
	const lineHeight = TITLE.size + 10;
	const startY = Math.trunc(TITLE.y - ((lines.length - 1) * lineHeight) / 2);
	lines.forEach((line, index) => {
		const y = startY + index * lineHeight;
		const style = { font: FONTS.black, size: TITLE.size };
		drawCenteredText(ctx, line, TITLE.x - 3, y + 3, { ...style, color: '#282828' });
		drawCenteredText(ctx, line, TITLE.x, y, { ...style, color: '#ffffff' });
	});

	const picture = await decodeImage(input.picture);
	drawFit(ctx, picture, 50, PICTURE_Y, PICTURE_WIDTH, PICTURE_HEIGHT);
	return encodeJpeg(canvas, 95);
}
