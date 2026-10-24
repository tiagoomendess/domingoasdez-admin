import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { COVER_HEIGHT, COVER_WIDTH, renderGameCover } from './game-cover.ts';
import { loadImage, placeholder } from './sources.ts';

const solid = (width: number, height: number, color: string, alpha = false) =>
	sharp({
		create: { width, height, channels: alpha ? 4 : 3, background: color }
	})
		.png()
		.toBuffer()
		.then((buffer) => new Uint8Array(buffer));

/** Bounding box of the pixels matching `test` in a region of the decoded cover. */
async function inkBox(
	jpeg: Uint8Array,
	region: { left: number; top: number; width: number; height: number },
	test: (r: number, g: number, b: number) => boolean
) {
	const { data } = await sharp(jpeg).extract(region).raw().toBuffer({ resolveWithObject: true });
	let minX = Infinity;
	let maxX = -1;
	for (let y = 0; y < region.height; y++) {
		for (let x = 0; x < region.width; x++) {
			const i = (y * region.width + x) * 3;
			if (test(data[i], data[i + 1], data[i + 2])) {
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
			}
		}
	}
	return { left: region.left + minX, right: region.left + maxX };
}

const isRed = (r: number, g: number, b: number) => r > 200 && g < 60 && b < 60;
const isWhite = (r: number, g: number, b: number) => r > 245 && g > 245 && b > 245;

describe('renderGameCover', () => {
	it('draws a 1280×720 JPEG with the legacy layout', async () => {
		const jpeg = await renderGameCover({
			// Dark background, red square emblems: easy to find in the result.
			background: await solid(1920, 1080, '#203040'),
			homeEmblem: await solid(500, 500, '#ff0000'),
			awayEmblem: await solid(400, 400, '#ff0000'),
			competitionLogo: await solid(100, 100, '#00ff00'),
			competition: 'Taça',
			homeClub: 'Fafe',
			awayClub: 'Arões',
			postponed: false
		});
		const meta = await sharp(jpeg).metadata();
		expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', COVER_WIDTH, COVER_HEIGHT]);

		// Emblems: 320 px wide, at x 190 and 770 (legacy positions).
		const row = { top: 355, height: 10, width: COVER_WIDTH, left: 0 };
		const home = await inkBox(jpeg, { ...row, width: 640 }, isRed);
		const away = await inkBox(jpeg, { ...row, left: 640, width: 640 }, isRed);
		expect(home.left).toBeCloseTo(190, -1);
		expect(home.right).toBeCloseTo(509, -1);
		expect(away.left).toBeCloseTo(770, -1);
		expect(away.right).toBeCloseTo(1089, -1);

		// Title and names centred on x = 640.
		for (const top of [140, 560]) {
			const text = await inkBox(jpeg, { left: 150, top, width: 980, height: 40 }, isWhite);
			expect(Math.abs((text.left + text.right) / 2 - 640)).toBeLessThan(4);
		}
	});

	it('draws from the bundled placeholders and default emblem', async () => {
		const jpeg = await renderGameCover({
			background: await loadImage(placeholder('1_1', 76)),
			homeEmblem: await loadImage('/images/default-emblem.png'),
			awayEmblem: await loadImage('/images/default-emblem.png'),
			competitionLogo: null,
			competition: 'Pré Época',
			homeClub: 'Granja',
			awayClub: 'ND Sta. Eugénia',
			postponed: true
		});
		// The 1000 px square background leaves the legacy white bands on both sides (sampled
		// between the watermark's frame and the photo).
		const { data } = await sharp(jpeg)
			.extract({ left: 60, top: 300, width: 70, height: 1 })
			.raw()
			.toBuffer({ resolveWithObject: true });
		expect(Math.min(...data)).toBeGreaterThan(200);
	});
});
