import { readFile } from 'node:fs/promises';
import { loadImage } from '@napi-rs/canvas';
import { assetPath } from '../assets.ts';
import {
	decodeImage,
	drawCenteredText,
	drawCircle,
	drawFit,
	encodeJpeg,
	FONTS,
	heightForWidth,
	newCanvas
} from './draw.ts';

export type MilestoneInput = {
	background: Uint8Array | null;
	/** The player's photo (or the default profile picture). */
	picture: Uint8Array | null;
	/** The player's club's emblem; none without a club. */
	emblem: Uint8Array | null;
	/** Legacy `firstAndLastName()`. */
	name: string;
	milestone: number;
};

type Layout = {
	width: number;
	height: number;
	overlay: [folder: string, file: string];
	picture: { size: number; y: number };
	name: { y: number; size: number; shadow: [number, number] };
	number: { y: number; size: number; shadow: [number, number] };
	goals: { y: number; size: number; shadow: [number, number] };
	emblem: { width: number; margin: number };
};

/** Legacy `generateMilestoneStory()` / `generateMilestonePost()`: same steps, two layouts. */
async function render(input: MilestoneInput, layout: Layout): Promise<Uint8Array> {
	const { width: W, height: H } = layout;
	const { canvas, ctx } = newCanvas(W, H, '#333333');
	if (input.background) drawFit(ctx, await decodeImage(input.background), 0, 0, W, H);
	const overlay = await loadImage(await readFile(assetPath(...layout.overlay)));
	drawFit(ctx, overlay, 0, 0, W, H);

	if (input.picture) {
		const { size } = layout.picture;
		drawCircle(
			ctx,
			await decodeImage(input.picture),
			Math.trunc((W - size) / 2),
			layout.picture.y,
			size
		);
	}

	const x = Math.trunc(W / 2);
	const texts: [string, Layout['name']][] = [
		[input.name, layout.name],
		[String(input.milestone), layout.number],
		['GOLOS', layout.goals]
	];
	for (const [text, style] of texts) {
		const font = { font: FONTS.black, size: style.size };
		drawCenteredText(ctx, text, x + style.shadow[0], style.y + style.shadow[1], {
			...font,
			color: '#000000'
		});
		drawCenteredText(ctx, text, x, style.y, { ...font, color: '#ffffff' });
	}

	if (input.emblem) {
		const emblem = await decodeImage(input.emblem);
		const { width, margin } = layout.emblem;
		// Intervention `insert($emblem, 'top-right', margin, margin)`.
		ctx.drawImage(emblem, W - margin - width, margin, width, heightForWidth(emblem, width));
	}
	return encodeJpeg(canvas, 90);
}

/** The 1080×1920 story: round photo, name, the milestone, "GOLOS", club emblem top right. */
export const renderMilestoneStory = (input: MilestoneInput) =>
	render(input, {
		width: 1080,
		height: 1920,
		overlay: ['images', 'story_watermark.png'],
		picture: { size: 750, y: Math.trunc(1920 * 0.09) },
		name: { y: Math.trunc(1920 * 0.53), size: 90, shadow: [-4, 5] },
		number: { y: Math.trunc(1920 * 0.7), size: 540, shadow: [-5, 6] },
		goals: { y: Math.trunc(1920 * 0.87), size: 200, shadow: [-3, 4] },
		emblem: { width: 150, margin: 40 }
	});

/** The 1080×1350 post: the same, smaller. */
export const renderMilestonePost = (input: MilestoneInput) =>
	render(input, {
		width: 1080,
		height: 1350,
		overlay: ['social_media_poster', 'post_watermark.png'],
		picture: { size: 500, y: Math.trunc(1350 * 0.08) },
		name: { y: Math.trunc(1350 * 0.5), size: 100, shadow: [-3, 4] },
		number: { y: Math.trunc(1350 * 0.7), size: 490, shadow: [-4, 5] },
		goals: { y: Math.trunc(1350 * 0.9), size: 150, shadow: [-2, 3] },
		emblem: { width: 120, margin: 30 }
	});
