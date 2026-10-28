import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
	ARTICLE_POST_TEMPLATE,
	articlePicturePath,
	renderArticlePost,
	wrapArticleTitle
} from './article-post.ts';
import { loadImage } from './sources.ts';

const pixel = async (jpeg: Uint8Array, x: number, y: number) => {
	const data = await sharp(jpeg).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer();
	return [...data];
};
const solid = (color: string, width = 400, height = 400) =>
	sharp({ create: { width, height, channels: 3, background: color } })
		.png()
		.toBuffer()
		.then((buffer) => new Uint8Array(buffer));

describe('wrapArticleTitle', () => {
	it('fills lines up to 32 bytes (32 × 0.6 × 50 px ≤ 980 px)', () => {
		// "duplica e chega às 14 equipas na" is 32 characters but 33 bytes.
		expect(
			wrapArticleTitle('Futebol feminino da AFPB quase duplica e chega às 14 equipas na época')
		).toEqual(['Futebol feminino da AFPB quase', 'duplica e chega às 14 equipas', 'na época']);
	});

	it('counts accented letters as two bytes, like PHP strlen', () => {
		// 32 characters, 33 bytes: "à" doesn't fit on the first line.
		expect(wrapArticleTitle('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa à')).toEqual([
			'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			'à'
		]);
	});

	it('keeps a word longer than the line whole', () => {
		const long = 'x'.repeat(40);
		expect(wrapArticleTitle(`Um ${long} fim`)).toEqual(['Um', long, 'fim']);
		expect(wrapArticleTitle('Curto')).toEqual(['Curto']);
	});
});

describe('articlePicturePath', () => {
	const cover = (mediaType: string, thumbnailUrl: string | null = null) => ({
		mediaType,
		url: '/storage/media/images/a.jpg',
		thumbnailUrl
	});

	it('uses the image, a video thumbnail, or the placeholder of the id', () => {
		expect(articlePicturePath(12, cover('image', '/storage/thumbs/a.jpg'))).toBe(
			'/storage/media/images/a.jpg'
		);
		expect(articlePicturePath(12, cover('youtube', '/storage/thumbs/v.jpg'))).toBe(
			'/storage/thumbs/v.jpg'
		);
		expect(articlePicturePath(12, cover('video'))).toBe('/images/16_9_placeholder_2.jpg');
		expect(articlePicturePath(57, null)).toBe('/images/16_9_placeholder_7.jpg');
	});
});

describe('renderArticlePost', () => {
	it('draws the title and the picture on the template, at the legacy size', async () => {
		const jpeg = await renderArticlePost({
			template: await loadImage(ARTICLE_POST_TEMPLATE),
			title: 'Futebol feminino da AFPB quase duplica e chega às 14 equipas na época',
			picture: await solid('#ff0000', 1600, 600)
		});
		const { format, width, height } = await sharp(jpeg).metadata();
		expect([format, width, height]).toEqual(['jpeg', 1080, 1350]);

		// The picture fills 50…1030 × 597…1148, cropped to 16:9.
		for (const [x, y] of [
			[52, 600],
			[540, 870],
			[1027, 1145]
		]) {
			const [r, g, b] = await pixel(jpeg, x, y);
			expect(r).toBeGreaterThan(230);
			expect(Math.max(g, b)).toBeLessThan(30);
		}
		// Outside it, the template's dark background.
		const [r] = await pixel(jpeg, 540, 1160);
		expect(r).toBeLessThan(100);

		// Three white title lines around y = 370 (310, 370, 430), none above or below them.
		const whiteIn = async (top: number, height: number) => {
			const data = await sharp(jpeg)
				.extract({ left: 0, top, width: 1080, height })
				.raw()
				.toBuffer();
			let count = 0;
			for (let i = 0; i < data.length; i += 3) {
				if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) count++;
			}
			return count;
		};
		for (const y of [310, 370, 430]) expect(await whiteIn(y - 15, 30)).toBeGreaterThan(500);
		expect(await whiteIn(200, 60)).toBe(0);
		expect(await whiteIn(480, 100)).toBe(0);
	});
});
