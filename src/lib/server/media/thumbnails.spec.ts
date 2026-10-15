import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { makeThumbnail } from './thumbnails';

describe('makeThumbnail', () => {
	it('shrinks uploaded images to a 900 px JPEG', async () => {
		const png = await sharp({
			create: { width: 2000, height: 1000, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
		})
			.png()
			.toBuffer();
		const thumbnail = await makeThumbnail({ type: 'image', url: '/storage/x.png', bytes: png });
		expect(await sharp(thumbnail).metadata()).toMatchObject({
			format: 'jpeg',
			width: 900,
			height: 450
		});
	});

	it('draws the legacy blue square for other files', async () => {
		const thumbnail = await makeThumbnail({ type: 'video', url: '/storage/media/videos/a.mp4' });
		const { format, width, height } = await sharp(thumbnail).metadata();
		expect({ format, width, height }).toEqual({ format: 'jpeg', width: 900, height: 900 });
		// The corner is the legacy blue (#107db7).
		const { data } = await sharp(thumbnail)
			.extract({ left: 5, top: 5, width: 1, height: 1 })
			.raw()
			.toBuffer({ resolveWithObject: true });
		expect(
			Math.abs(data[0] - 0x10) + Math.abs(data[1] - 0x7d) + Math.abs(data[2] - 0xb7)
		).toBeLessThan(15);
	});

	it('refuses YouTube links without a video id', async () => {
		await expect(
			makeThumbnail({ type: 'youtube', url: 'https://www.youtube.com/@canal' })
		).rejects.toThrow();
	});
});
