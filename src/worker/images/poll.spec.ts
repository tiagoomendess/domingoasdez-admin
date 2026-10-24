import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { POLL_HEIGHT, POLL_WIDTH, renderPollImage } from './poll.ts';

/** Rows (y) that contain white text pixels, grouped into runs. */
async function textRows(jpeg: Uint8Array) {
	const { data } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
	const rows: number[] = [];
	for (let y = 0; y < POLL_HEIGHT; y++) {
		let white = 0;
		for (let x = 300; x < 980; x++) {
			const i = (y * POLL_WIDTH + x) * 3;
			if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) white++;
		}
		if (white > 3) rows.push(y);
	}
	const runs: [number, number][] = [];
	for (const y of rows) {
		const last = runs.at(-1);
		// Thin descender tips (the p of "Popular") can skip a row or two.
		if (last && y - last[1] <= 8) last[1] = y;
		else runs.push([y, y]);
	}
	return runs;
}

const centre = ([top, bottom]: [number, number]) => (top + bottom) / 2;

describe('renderPollImage', () => {
	it('draws a 1280×720 JPEG', async () => {
		const meta = await sharp(await renderPollImage('Que Formato preferes')).metadata();
		expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', POLL_WIDTH, POLL_HEIGHT]);
	});

	it('centres one line on y = 480', async () => {
		const runs = await textRows(await renderPollImage('Que Formato preferes'));
		const line = runs.find((run) => run[0] > 400);
		expect(line).toBeDefined();
		expect(Math.abs(centre(line!) - 480)).toBeLessThan(4);
	});

	it('puts two lines 70 px apart around y = 480', async () => {
		const runs = await textRows(
			await renderPollImage('Quem é o jogador revelação da 2ª Divisão do Futebol Popular?')
		);
		const lines = runs.filter((run) => run[0] > 400);
		expect(lines).toHaveLength(2);
		expect(Math.abs(centre(lines[0]) - 445)).toBeLessThan(5);
		expect(Math.abs(centre(lines[1]) - 515)).toBeLessThan(5);
	});
});
