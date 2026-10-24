import { readFile } from 'node:fs/promises';
import { loadImage } from '@napi-rs/canvas';
import { assetPath } from '../assets.ts';
import {
	decodeImage,
	drawCenteredText,
	drawFit,
	encodeJpeg,
	FONTS,
	floodFill,
	newCanvas
} from './draw.ts';

export type BirthdayInput = {
	/** The club's first playground's picture; none draws on the plain grey canvas. */
	background: Uint8Array | null;
	emblem: Uint8Array | null;
	club: string;
	age: number;
};

const template = async (name: string) =>
	loadImage(await readFile(assetPath('social_media_poster', name)));

/** Name and age with their black shadows, as legacy (offsets per size). */
function drawTexts(
	ctx: Parameters<typeof drawCenteredText>[0],
	input: BirthdayInput,
	layout: {
		x: number;
		nameY: number;
		nameSize: number;
		nameShadow: [number, number];
		ageY: number;
		ageSize: number;
		ageShadow: [number, number];
	}
) {
	const { x } = layout;
	const name = { font: FONTS.black, size: layout.nameSize };
	drawCenteredText(ctx, input.club, x + layout.nameShadow[0], layout.nameY + layout.nameShadow[1], {
		...name,
		color: '#000000'
	});
	drawCenteredText(ctx, input.club, x, layout.nameY, { ...name, color: '#ffffff' });
	const age = String(input.age);
	const big = { font: FONTS.black, size: layout.ageSize };
	drawCenteredText(ctx, age, x + layout.ageShadow[0], layout.ageY + layout.ageShadow[1], {
		...big,
		color: '#000000'
	});
	drawCenteredText(ctx, age, x, layout.ageY, { ...big, color: '#ffffff' });
}

/**
 * Legacy `ClubBirthdays::generateBirthdayStory()` (1080×1920): playground picture cropped to fill,
 * `birthday_story.png`, the club's name, its emblem (750 px square) and the years in the middle.
 */
export async function renderBirthdayStory(input: BirthdayInput): Promise<Uint8Array> {
	const W = 1080;
	const H = 1920;
	const { canvas, ctx } = newCanvas(W, H, '#333333');
	if (input.background) drawFit(ctx, await decodeImage(input.background), 0, 0, W, H);
	ctx.drawImage(await template('birthday_story.png'), 0, 0);

	if (input.emblem) {
		const size = 750;
		drawFit(
			ctx,
			await decodeImage(input.emblem),
			Math.trunc((W - size) / 2),
			Math.trunc((H - size) / 2),
			size,
			size
		);
	}
	// Legacy drew the name before the emblem; they don't overlap.
	drawTexts(ctx, input, {
		x: Math.trunc(W / 2),
		nameY: Math.trunc(H * 0.23),
		nameSize: 120,
		nameShadow: [-4, 5],
		ageY: Math.trunc(H * 0.78),
		ageSize: 250,
		ageShadow: [-5, 6]
	});
	return encodeJpeg(canvas, 90);
}

/**
 * Legacy `ClubBirthdays::generateBirthdayPost()` (1000×1250): like the story, emblem 500 px.
 * Legacy meant to darken the picture 33 % (`fill('#000000', 0, 0, opacity)`), but GD's `fill()`
 * with a position is a flood fill and ignores the opacity: it paints black only the area of the
 * top-left pixel's exact colour (a few pixels on a photo, the whole canvas without one). That
 * output is reproduced.
 */
export async function renderBirthdayPost(input: BirthdayInput): Promise<Uint8Array> {
	const W = 1000;
	const H = 1250;
	const { canvas, ctx } = newCanvas(W, H, '#333333');
	if (input.background) drawFit(ctx, await decodeImage(input.background), 0, 0, W, H);
	floodFill(canvas, 0, 0, [0, 0, 0]);
	ctx.drawImage(await template('birthday_post.png'), 0, 0);

	if (input.emblem) {
		const size = 500;
		drawFit(
			ctx,
			await decodeImage(input.emblem),
			Math.trunc((W - size) / 2),
			Math.trunc((H - size) / 2),
			size,
			size
		);
	}
	drawTexts(ctx, input, {
		x: Math.trunc(W / 2),
		nameY: Math.trunc(H * 0.22),
		nameSize: 100,
		nameShadow: [-3, 4],
		ageY: Math.trunc(H * 0.8),
		ageSize: 180,
		ageShadow: [-4, 5]
	});
	return encodeJpeg(canvas, 90);
}
