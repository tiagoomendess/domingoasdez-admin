import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { renderBirthdayPost, renderBirthdayStory } from './club-birthday.ts';
import { renderMilestonePost, renderMilestoneStory } from './goal-milestone.ts';
import { loadImage, placeholder } from './sources.ts';

const pixel = async (jpeg: Uint8Array, x: number, y: number) => {
	const { data } = await sharp(jpeg)
		.extract({ left: x, top: y, width: 1, height: 1 })
		.raw()
		.toBuffer({ resolveWithObject: true });
	return [...data];
};
const size = async (jpeg: Uint8Array) => {
	const { width, height, format } = await sharp(jpeg).metadata();
	return [format, width, height];
};
const solid = (color: string) =>
	sharp({ create: { width: 400, height: 400, channels: 3, background: color } })
		.png()
		.toBuffer()
		.then((buffer) => new Uint8Array(buffer));

describe('club birthday images', () => {
	it('draws the story and the post at the legacy sizes', async () => {
		const input = {
			background: await loadImage(placeholder('16_9', 4)),
			emblem: await loadImage('/images/default-emblem.png'),
			club: 'Fafe',
			age: 53
		};
		expect(await size(await renderBirthdayStory(input))).toEqual(['jpeg', 1080, 1920]);
		expect(await size(await renderBirthdayPost(input))).toEqual(['jpeg', 1000, 1250]);
	});

	it("paints the post's grey canvas black without a playground (legacy flood fill)", async () => {
		const post = await renderBirthdayPost({ background: null, emblem: null, club: 'Fafe', age: 1 });
		// Below the template's title, left of the emblem: background only.
		const [r, g, b] = await pixel(post, 40, 600);
		expect(Math.max(r, g, b)).toBeLessThan(20);
		const story = await renderBirthdayStory({
			background: null,
			emblem: null,
			club: 'Fafe',
			age: 1
		});
		// The story has no fill: its grey stays under the template, so it is brighter overall.
		const mean = async (jpeg: Uint8Array) =>
			(await sharp(jpeg).stats()).channels.slice(0, 3).reduce((sum, c) => sum + c.mean, 0) / 3;
		expect(await mean(story)).toBeGreaterThan((await mean(post)) + 10);
	});

	it('blacks out only the area of the top-left colour', async () => {
		// Left half one colour, right half another.
		const background = new Uint8Array(
			await sharp({ create: { width: 1000, height: 1250, channels: 3, background: '#3366aa' } })
				.composite([
					{
						input: { create: { width: 500, height: 1250, channels: 3, background: '#aa6633' } },
						left: 500,
						top: 0
					}
				])
				.png()
				.toBuffer()
		);
		const post = await renderBirthdayPost({ background, emblem: null, club: 'Fafe', age: 1 });
		const [lr, lg, lb] = await pixel(post, 40, 600);
		expect(Math.max(lr, lg, lb)).toBeLessThan(20);
		const [rr, rg, rb] = await pixel(post, 960, 600);
		expect(rr).toBeGreaterThan(rb);
		expect(rr).toBeGreaterThan(120);
		expect(rg).toBeGreaterThan(50);
	});
});

describe('goal milestone images', () => {
	const input = async () => ({
		background: await loadImage(placeholder('16_9', 9)),
		picture: await solid('#ff0000'),
		emblem: await loadImage('/images/default-emblem.png'),
		name: 'João Costa',
		milestone: 50
	});

	it('draws the story and the post at the legacy sizes', async () => {
		expect(await size(await renderMilestoneStory(await input()))).toEqual(['jpeg', 1080, 1920]);
		expect(await size(await renderMilestonePost(await input()))).toEqual(['jpeg', 1080, 1350]);
	});

	it('masks the photo to a circle', async () => {
		const story = await renderMilestoneStory(await input());
		// The photo square is 750 px at (165, 172): red in the middle, not in its corner.
		const [cr, cg, cb] = await pixel(story, 165 + 375, 172 + 375);
		expect([cr > 200, cg < 60, cb < 60]).toEqual([true, true, true]);
		const [kr, kg, kb] = await pixel(story, 165 + 10, 172 + 10);
		expect(kr > 200 && kg < 60 && kb < 60).toBe(false);
	});
});
