import { readFile } from 'node:fs/promises';
import { loadImage } from '@napi-rs/canvas';
import { assetPath } from '../assets.ts';
import { siteDay, SITE_TIME_ZONE } from '../time.ts';
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

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/** Legacy `translateMonth()`. */
const MONTHS = [
	'Janeiro',
	'Fevereiro',
	'Março',
	'Abril',
	'Maio',
	'Junho',
	'Julho',
	'Agosto',
	'Setembro',
	'Outubro',
	'Novembro',
	'Dezembro'
];

export type MatchStoryInput = {
	background: Uint8Array;
	homeEmblem: Uint8Array;
	awayEmblem: Uint8Array;
	competitionLogo: Uint8Array | null;
	competition: string;
	homeClub: string;
	awayClub: string;
	/** Shown under the date; empty without a playground. */
	playground: string;
	kickOff: Date;
	/** Finished games show the final score instead of the date and the playground. */
	result: { home: number; away: number; penalties: { home: number; away: number } | null } | null;
};

const W = STORY_WIDTH;
const H = STORY_HEIGHT;
const shadow = (color: string) => ({ color });

/** `25 DE OUTUBRO | 10H00` in Lisbon time (legacy `d`, month name, `H\Hi`). */
export function storyDateLine(kickOff: Date): string {
	const [, month, day] = siteDay(kickOff).split('-');
	const time = new Intl.DateTimeFormat('en-GB', {
		timeZone: SITE_TIME_ZONE,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	})
		.format(kickOff)
		.replace(':', 'H');
	return `${day} DE ${MONTHS[Number(month) - 1].toUpperCase()} | ${time}`;
}

/**
 * Legacy `MatchImageGeneratorService::generateStoryImage()`: the 1080×1920 story that promotes a
 * game (`schedule-social-media`). Background scaled to the story's height and blurred, overlay,
 * competition name and logo, both emblems, the club names, then the date and playground (or the
 * final score for a finished game). Positions are the legacy ones, with its `(int)` truncation.
 */
export async function renderMatchStory(input: MatchStoryInput): Promise<Uint8Array> {
	const { canvas, ctx } = newCanvas(W, H);

	const background = await decodeImage(input.background);
	const backgroundWidth = Math.round((H * background.width) / background.height);
	ctx.drawImage(background, Math.round((W - backgroundWidth) / 2), 0, backgroundWidth, H);
	await blur(canvas, Math.round(W / 100));
	drawCentered(
		ctx,
		await loadImage(await readFile(assetPath('images', 'story_watermark.png'))),
		W,
		H
	);

	const competition = input.competition.toUpperCase();
	const titleY = Math.trunc(H / 3.5);
	const title = { font: FONTS.black, size: 70 };
	drawCenteredText(ctx, competition, W / 2 + 2, titleY + 2, { ...title, ...shadow('#484848') });
	drawCenteredText(ctx, competition, W / 2, titleY, { ...title, color: '#ffffff' });

	if (input.competitionLogo) {
		const logo = await decodeImage(input.competitionLogo);
		const width = Math.trunc(W / 5);
		const height = heightForWidth(logo, width);
		ctx.drawImage(
			logo,
			Math.trunc(W / 2 - width / 2),
			Math.trunc(H / 5.5 - height / 2),
			width,
			height
		);
	}

	const emblemWidth = Math.trunc(W / 2.5);
	const [home, away] = await Promise.all([
		decodeImage(input.homeEmblem),
		decodeImage(input.awayEmblem)
	]);
	const homeHeight = heightForWidth(home, emblemWidth);
	const awayHeight = heightForWidth(away, emblemWidth);
	ctx.drawImage(
		home,
		Math.trunc(W / 4 + 30 - emblemWidth / 2),
		Math.trunc(H / 2 - homeHeight / 2),
		emblemWidth,
		homeHeight
	);
	ctx.drawImage(
		away,
		Math.trunc((W / 4) * 3 - 30 - emblemWidth / 2),
		Math.trunc(H / 2 - awayHeight / 2),
		emblemWidth,
		awayHeight
	);

	const names = `${input.homeClub.toUpperCase()} vs ${input.awayClub.toUpperCase()}`;
	const namesY = Math.trunc(H / 3.1);
	const caption = { font: FONTS.regular, size: 40 };
	drawCenteredText(ctx, names, W / 2 + 2, namesY + 12, { ...caption, ...shadow('#282828') });
	drawCenteredText(ctx, names, W / 2, namesY + 10, { ...caption, color: '#ffffff' });

	const infoY = Math.trunc((H / 5) * 3.5);
	if (input.result) {
		const top = { valign: 'top' } as const;
		const label = { font: FONTS.regular, size: 55, ...top };
		drawCenteredText(ctx, 'RESULTADO FINAL', W / 2 + 2, infoY - 29, {
			...label,
			...shadow('#282828')
		});
		drawCenteredText(ctx, 'RESULTADO FINAL', W / 2, infoY - 30, { ...label, color: '#ffffff' });
		const score = `${input.result.home} - ${input.result.away}`;
		const big = { font: FONTS.black, size: 210, ...top };
		drawCenteredText(ctx, score, W / 2 + 2, infoY + 42, { ...big, ...shadow('#484848') });
		drawCenteredText(ctx, score, W / 2, infoY + 40, { ...big, color: '#ffffff' });
		if (input.result.penalties) {
			const penalties = `(${input.result.penalties.home}-${input.result.penalties.away} g.p)`;
			const small = { font: FONTS.black, size: 60, ...top };
			drawCenteredText(ctx, penalties, W / 2 + 1, infoY + 232, { ...small, ...shadow('#282828') });
			drawCenteredText(ctx, penalties, W / 2, infoY + 230, { ...small, color: '#ffffff' });
		}
	} else {
		const date = storyDateLine(input.kickOff);
		const dateStyle = { font: FONTS.black, size: 70 };
		drawCenteredText(ctx, date, W / 2 + 1, infoY + 1, { ...dateStyle, ...shadow('#484848') });
		drawCenteredText(ctx, date, W / 2, infoY, { ...dateStyle, color: '#ffffff' });
		const playground = input.playground.toUpperCase();
		const placeStyle = { font: FONTS.regular, size: 50 };
		// Legacy drew the shadow 1 px above the text here.
		drawCenteredText(ctx, playground, W / 2 + 1, infoY + 70, {
			...placeStyle,
			...shadow('#484848')
		});
		drawCenteredText(ctx, playground, W / 2, infoY + 71, { ...placeStyle, color: '#ffffff' });
	}

	// Intervention's `encode('jpg')` default quality.
	return encodeJpeg(canvas, 90);
}
