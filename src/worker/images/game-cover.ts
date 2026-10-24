import { readFile } from 'node:fs/promises';
import { loadImage } from '@napi-rs/canvas';
import { assetPath } from '../assets.ts';
import {
	blur,
	decodeImage,
	drawCentered,
	drawCenteredText,
	encodeJpeg,
	FONTS,
	heightForWidth,
	newCanvas
} from './draw.ts';

export const COVER_WIDTH = 1280;
export const COVER_HEIGHT = 720;

export type GameCoverInput = {
	background: Uint8Array;
	homeEmblem: Uint8Array;
	awayEmblem: Uint8Array;
	/** The season's (or competition's) logo; none is drawn without one (legacy crashed). */
	competitionLogo: Uint8Array | null;
	/** Shown in upper case, like the club names. */
	competition: string;
	homeClub: string;
	awayClub: string;
	postponed: boolean;
};

const W = COVER_WIDTH;
const H = COVER_HEIGHT;

/**
 * Legacy `GenerateGameImage`: the 1280×720 game cover (`games.image`). Same layout, step by step:
 * blurred background at its natural size, watermark, competition name and logo at the top, both
 * emblems in the middle, "HOME vs AWAY" at the bottom, and the "postponed" overlay.
 */
export async function renderGameCover(input: GameCoverInput): Promise<Uint8Array> {
	const { canvas, ctx } = newCanvas(W, H);

	drawCentered(ctx, await decodeImage(input.background), W, H);
	await blur(canvas, Math.round(W / 100));
	ctx.drawImage(
		await loadImage(await readFile(assetPath('images', 'game_image_watermark.png'))),
		0,
		0
	);

	// Competition name: shadow 2 px right and down.
	const competition = input.competition.toUpperCase();
	const title = { font: FONTS.black, size: 55 };
	drawCenteredText(ctx, competition, W / 2 + 2, H / 5 + 22, { ...title, color: '#484848' });
	drawCenteredText(ctx, competition, W / 2, H / 5 + 20, { ...title, color: '#ffffff' });

	if (input.competitionLogo) {
		const logo = await decodeImage(input.competitionLogo);
		const width = Math.trunc(W / 15);
		const height = heightForWidth(logo, width);
		ctx.drawImage(
			logo,
			Math.round(W / 2 - width / 2),
			Math.round(H / 9 - height / 2),
			width,
			height
		);
	}

	const emblemWidth = Math.round(W / 4);
	const [home, away] = await Promise.all([
		decodeImage(input.homeEmblem),
		decodeImage(input.awayEmblem)
	]);
	const homeHeight = heightForWidth(home, emblemWidth);
	const awayHeight = heightForWidth(away, emblemWidth);
	ctx.drawImage(
		home,
		Math.round(W / 4) + 30 - Math.round(emblemWidth / 2),
		Math.round(H / 2) - Math.round(homeHeight / 2),
		emblemWidth,
		homeHeight
	);
	ctx.drawImage(
		away,
		Math.round((W / 4) * 3) - 30 - Math.round(emblemWidth / 2),
		Math.round(H / 2) - Math.round(awayHeight / 2),
		emblemWidth,
		awayHeight
	);

	const names = `${input.homeClub.toUpperCase()} vs ${input.awayClub.toUpperCase()}`;
	const caption = { font: FONTS.regular, size: 40 };
	drawCenteredText(ctx, names, W / 2 + 2, H - Math.round(H / 5) + 2, {
		...caption,
		color: '#282828'
	});
	drawCenteredText(ctx, names, W / 2, H - Math.round(H / 5), { ...caption, color: '#ffffff' });

	if (input.postponed) {
		const overlay = await readFile(assetPath('images', 'game_image_postponed_watermark.png'));
		ctx.drawImage(await loadImage(overlay), 0, 0);
	}

	return encodeJpeg(canvas);
}
