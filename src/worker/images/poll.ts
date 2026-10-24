import { readFile } from 'node:fs/promises';
import { loadImage } from '@napi-rs/canvas';
import { assetPath } from '../assets.ts';
import { drawCentered, drawCenteredText, encodeJpeg, FONTS, newCanvas } from './draw.ts';
import { phpWordwrap } from './wordwrap.ts';

export const POLL_WIDTH = 1280;
export const POLL_HEIGHT = 720;

/** Legacy wrapping width, in bytes (PHP `wordwrap`). */
const LINE_LENGTH = 36;
/** Half the distance between two lines' centres. */
const LINE_HALF_STEP = 35;

/**
 * Legacy `ProcessPolls` image (`polls.image`): the question in white over `poll_default.png`,
 * wrapped at 36 bytes, lines 70 px apart, centred around y = 480 (each line centred on its ink).
 */
export async function renderPollImage(question: string): Promise<Uint8Array> {
	const { canvas, ctx } = newCanvas(POLL_WIDTH, POLL_HEIGHT);
	const background = await loadImage(await readFile(assetPath('images', 'poll_default.png')));
	drawCentered(ctx, background, POLL_WIDTH, POLL_HEIGHT);

	const lines = phpWordwrap(question, LINE_LENGTH);
	let y = POLL_HEIGHT / 2 + 120 - (lines.length - 1) * LINE_HALF_STEP;
	for (const line of lines) {
		drawCenteredText(ctx, line, POLL_WIDTH / 2, y, {
			font: FONTS.regular,
			size: 60,
			color: '#ffffff'
		});
		y += LINE_HALF_STEP * 2;
	}

	return encodeJpeg(canvas);
}
