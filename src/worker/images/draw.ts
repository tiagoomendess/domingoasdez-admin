import {
	createCanvas,
	GlobalFonts,
	loadImage,
	type Canvas,
	type Image,
	type SKRSContext2D
} from '@napi-rs/canvas';
import sharp from 'sharp';
import { IMAGE_LIMITS } from '#lib/server/storage/images.ts';
import { assetPath } from '../assets.ts';

/**
 * Drawing helpers that reproduce the legacy Intervention Image (GD) calls the jobs used, so the
 * generated images keep their layout: Skia (`@napi-rs/canvas`) draws, `sharp` decodes, blurs and
 * encodes.
 */

export const FONTS = { regular: 'DadRobotoRegular', black: 'DadRobotoBlack' } as const;
export const FONT_FILES = { regular: 'Roboto-Regular.ttf', black: 'Roboto-Black.ttf' } as const;

let fontsRegistered = false;

/**
 * Registers the fonts once, from the worker's assets, or from `files`: the admin's build has no
 * assets folder, so it passes the copies it bundles (`#lib/server/articles/facebook.ts`). Throws
 * when one is missing rather than drawing the texts in a fallback font.
 */
export function registerFonts(files?: Record<keyof typeof FONTS, Uint8Array>) {
	if (fontsRegistered) return;
	for (const key of ['regular', 'black'] as const) {
		if (files) GlobalFonts.register(Buffer.from(files[key]), FONTS[key]);
		else GlobalFonts.registerFromPath(assetPath('fonts', FONT_FILES[key]), FONTS[key]);
		if (!GlobalFonts.has(FONTS[key])) throw new Error(`Font ${FONT_FILES[key]} not loaded`);
	}
	fontsRegistered = true;
}

/** A canvas filled with `background` (legacy JPEGs were flattened onto white). */
export function newCanvas(width: number, height: number, background = '#ffffff') {
	registerFonts();
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, width, height);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	return { canvas, ctx };
}

/** Any format sharp reads (JPEG, PNG, WebP, AVIF, SVG, …), EXIF-rotated, as a drawable image. */
export async function decodeImage(bytes: Uint8Array): Promise<Image> {
	const png = await sharp(bytes, { failOn: 'error' }).rotate().png().toBuffer();
	return loadImage(png);
}

/** Intervention `insert($img, 'center')`: natural size, centred, cropped by the canvas. */
export function drawCentered(ctx: SKRSContext2D, image: Image, width: number, height: number) {
	ctx.drawImage(
		image,
		Math.round((width - image.width) / 2),
		Math.round((height - image.height) / 2)
	);
}

/**
 * Intervention `fit($width, $height)` then insert at (x, y): the largest centred crop with the
 * target's proportions, scaled (up or down) to fill it.
 */
export function drawFit(
	ctx: SKRSContext2D,
	image: Image,
	x: number,
	y: number,
	width: number,
	height: number
) {
	const scale = Math.max(width / image.width, height / image.height);
	const cropWidth = width / scale;
	const cropHeight = height / scale;
	ctx.drawImage(
		image,
		(image.width - cropWidth) / 2,
		(image.height - cropHeight) / 2,
		cropWidth,
		cropHeight,
		x,
		y,
		width,
		height
	);
}

/**
 * `drawFit()` into a square, masked to a circle (legacy: a white disc 2 px smaller than the square
 * on a black mask, `mask($mask, false)`).
 */
export function drawCircle(ctx: SKRSContext2D, image: Image, x: number, y: number, size: number) {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x + size / 2, y + size / 2, (size - 2) / 2, 0, Math.PI * 2);
	ctx.clip();
	drawFit(ctx, image, x, y, size, size);
	ctx.restore();
}

/**
 * GD `imagefill()` (Intervention `fill($color, $x, $y)`): the 4-connected area of exactly the
 * colour at (x, y) is painted `rgb`.
 */
export function floodFill(canvas: Canvas, x: number, y: number, rgb: [number, number, number]) {
	const { width, height } = canvas;
	const ctx = canvas.getContext('2d');
	const pixels = ctx.getImageData(0, 0, width, height);
	const data = pixels.data;
	const start = (y * width + x) * 4;
	const target = data.slice(start, start + 4);
	if (target[0] === rgb[0] && target[1] === rgb[1] && target[2] === rgb[2] && target[3] === 255) {
		return;
	}
	const matches = (i: number) =>
		data[i] === target[0] &&
		data[i + 1] === target[1] &&
		data[i + 2] === target[2] &&
		data[i + 3] === target[3];
	const stack = [y * width + x];
	while (stack.length) {
		const pixel = stack.pop()!;
		const i = pixel * 4;
		if (!matches(i)) continue;
		data[i] = rgb[0];
		data[i + 1] = rgb[1];
		data[i + 2] = rgb[2];
		data[i + 3] = 255;
		const px = pixel % width;
		if (px > 0) stack.push(pixel - 1);
		if (px < width - 1) stack.push(pixel + 1);
		if (pixel >= width) stack.push(pixel - width);
		if (pixel < width * (height - 1)) stack.push(pixel + width);
	}
	ctx.putImageData(pixels, 0, 0);
}

/** Intervention `resize($width, null, aspectRatio)` (upscales too): the new height. */
export const heightForWidth = (image: Pick<Image, 'width' | 'height'>, width: number) =>
	Math.round((width * image.height) / image.width);

/** GD's `IMG_FILTER_GAUSSIAN_BLUR` kernel. */
const GD_GAUSSIAN = { width: 3, height: 3, kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1], scale: 16 };

/**
 * GD `blur($amount)`: `$amount` passes of GD's 3×3 Gaussian, pass by pass (each pass rounds to
 * 8 bits like GD). Compared with a legacy cover this is within JPEG noise, where a single
 * Gaussian of the same strength came out brighter. ~5 ms per pass at 1280×720.
 */
export async function blur(canvas: Canvas, amount: number): Promise<void> {
	const { width, height } = canvas;
	const ctx = canvas.getContext('2d');
	const pixels = ctx.getImageData(0, 0, width, height);
	const raw = { width, height, channels: 4 } as const;
	let data = Buffer.from(pixels.data.buffer);
	for (let pass = 0; pass < amount; pass++) {
		data = await sharp(data, { raw }).convolve(GD_GAUSSIAN).raw().toBuffer();
	}
	pixels.data.set(data);
	ctx.putImageData(pixels, 0, 0);
}

/** Intervention font `size` with a TTF file: GD points (`ceil(size × 0.75)`) at 96 DPI, in px. */
export const gdFontPx = (size: number) => (Math.ceil(size * 0.75) * 96) / 72;

/**
 * Intervention `text()` with `align('center')` and `valign('center')` (or `'top'`): GD's text box
 * is centred on x, and centred on y (or starts at y). The box is the ink, except that GD counts a
 * leading space from the pen origin and a trailing space with its whole advance, so `" 7 "` is
 * centred on its full width.
 */
export function drawCenteredText(
	ctx: SKRSContext2D,
	text: string,
	x: number,
	y: number,
	style: { font: string; size: number; color: string; valign?: 'center' | 'top' }
) {
	ctx.font = `${gdFontPx(style.size)}px ${style.font}`;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	const box = ctx.measureText(text);
	let left = -box.actualBoundingBoxLeft;
	let right = box.actualBoundingBoxRight;
	if (text.startsWith(' ')) left = Math.min(left, 0);
	if (text.endsWith(' ')) right = Math.max(right, box.width);
	const originX = x - Math.round((left + right) / 2);
	const originY =
		style.valign === 'top'
			? y + Math.round(box.actualBoundingBoxAscent)
			: y + Math.round((box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2);
	ctx.fillStyle = style.color;
	ctx.fillText(text, originX, originY);
}

/** Legacy `ImageOptimizer::store($image, …, 'jpg', GENERATED_QUALITY)`: progressive JPEG. */
export async function encodeJpeg(
	canvas: Canvas,
	quality: number = IMAGE_LIMITS.generatedQuality
): Promise<Uint8Array> {
	const { width, height } = canvas;
	const pixels = canvas.getContext('2d').getImageData(0, 0, width, height);
	const jpeg = await sharp(Buffer.from(pixels.data.buffer), { raw: { width, height, channels: 4 } })
		.flatten({ background: '#ffffff' })
		.jpeg({ quality, progressive: true, mozjpeg: true })
		.toBuffer();
	return new Uint8Array(jpeg);
}
