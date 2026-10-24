import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { renderMatchStory, storyDateLine, STORY_HEIGHT, STORY_WIDTH } from './match-story.ts';
import { renderMoreMatchesStory } from './more-matches.ts';
import { loadImage, placeholder } from './sources.ts';

const emblem = () => loadImage('/images/default-emblem.png');

/** Horizontal extent of white pixels in a band of rows. */
async function whiteExtent(
	jpeg: Uint8Array,
	top: number,
	height: number,
	left0 = 0,
	width = STORY_WIDTH
) {
	const { data, info } = await sharp(jpeg)
		.extract({ left: left0, top, width, height })
		.raw()
		.toBuffer({ resolveWithObject: true });
	let left = Infinity;
	let right = -1;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < info.width; x++) {
			const i = (y * info.width + x) * 3;
			if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
				left = Math.min(left, left0 + x);
				right = Math.max(right, left0 + x);
			}
		}
	}
	return { left, right, centre: (left + right) / 2 };
}

describe('storyDateLine', () => {
	it('writes the kick-off in Lisbon time, like legacy', () => {
		expect(storyDateLine(new Date('2026-07-05T09:00:00Z'))).toBe('05 DE JULHO | 10H00');
		expect(storyDateLine(new Date('2026-12-06T15:30:00Z'))).toBe('06 DE DEZEMBRO | 15H30');
	});
});

describe('renderMatchStory', () => {
	const input = async () => ({
		background: await loadImage(placeholder('16_9', 3)),
		homeEmblem: await emblem(),
		awayEmblem: await emblem(),
		competitionLogo: null,
		competition: 'Taça',
		homeClub: 'Fafe',
		awayClub: 'Arões',
		playground: 'Campo da Feira',
		kickOff: new Date('2026-07-05T09:00:00Z')
	});

	it('draws a 1080×1920 story with the date centred', async () => {
		const jpeg = await renderMatchStory({ ...(await input()), result: null });
		const meta = await sharp(jpeg).metadata();
		expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', STORY_WIDTH, STORY_HEIGHT]);
		const date = await whiteExtent(jpeg, 1320, 50);
		expect(Math.abs(date.centre - 540)).toBeLessThan(4);
	});

	it('draws the final score of a finished game', async () => {
		const jpeg = await renderMatchStory({
			...(await input()),
			result: { home: 1, away: 3, penalties: null }
		});
		// The score's digits fill the band below "RESULTADO FINAL".
		const score = await whiteExtent(jpeg, 1420, 80);
		expect(score.right - score.left).toBeGreaterThan(300);
		expect(Math.abs(score.centre - 540)).toBeLessThan(6);
	});
});

describe('renderMoreMatchesStory', () => {
	it('centres the number on the story', async () => {
		const jpeg = await renderMoreMatchesStory(8);
		// Between the photo's white shirts on both sides.
		const digit = await whiteExtent(jpeg, 760, 60, 300, 480);
		expect(Math.abs(digit.centre - 540)).toBeLessThan(25);
	});
});
