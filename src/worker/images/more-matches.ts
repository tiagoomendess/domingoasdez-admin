import { readFile } from 'node:fs/promises';
import { loadImage } from '@napi-rs/canvas';
import { assetPath } from '../assets.ts';
import { drawCenteredText, encodeJpeg, FONTS, newCanvas } from './draw.ts';

/**
 * Legacy `ScheduleSocialMedia::promoteRandomMatches()` story: `story_more_matches.png` with the
 * number of games that weren't promoted, huge, with a black shadow (6 px left, 10 px down).
 */
export async function renderMoreMatchesStory(remaining: number): Promise<Uint8Array> {
	const template = await loadImage(
		await readFile(assetPath('social_media_poster', 'story_more_matches.png'))
	);
	const { canvas, ctx } = newCanvas(template.width, template.height);
	ctx.drawImage(template, 0, 0);

	// Legacy drew " N " (spaces included), centred like GD does.
	const text = ` ${remaining} `;
	const x = Math.trunc(template.width / 2);
	const y = Math.trunc(template.height / 2) - 140;
	drawCenteredText(ctx, text, x - 6, y + 10, { font: FONTS.black, size: 660, color: '#000000' });
	drawCenteredText(ctx, text, x, y, { font: FONTS.black, size: 650, color: '#ffffff' });

	return encodeJpeg(canvas, 90);
}
