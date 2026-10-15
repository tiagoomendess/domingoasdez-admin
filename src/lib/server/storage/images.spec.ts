import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { IMAGE_LIMITS, hasTransparency, keepsOriginal, optimizeImage } from './images';

async function png(width: number, height: number, alpha: number) {
	const data = await sharp({
		create: { width, height, channels: 4, background: { r: 25, g: 118, b: 210, alpha } }
	})
		.png()
		.toBuffer();
	return new Uint8Array(data);
}

describe('optimizeImage', () => {
	it('re-encodes opaque images as progressive JPEG capped to the content size', async () => {
		const result = await optimizeImage(await png(3000, 1500, 1));
		const meta = await sharp(result.data).metadata();

		expect(result).toMatchObject({ extension: 'jpg', contentType: 'image/jpeg' });
		expect(meta.format).toBe('jpeg');
		expect(meta.isProgressive).toBe(true);
		expect(meta.width).toBe(IMAGE_LIMITS.contentMaxSize);
		expect(meta.height).toBe(IMAGE_LIMITS.contentMaxSize / 2);
	});

	it('keeps PNG when the image uses transparency (emblems, logos)', async () => {
		const result = await optimizeImage(await png(100, 100, 0.5));
		expect(result.extension).toBe('png');
		expect((await sharp(result.data).metadata()).hasAlpha).toBe(true);
	});

	it('never enlarges and crops squares for photos', async () => {
		const small = await optimizeImage(await png(300, 200, 1));
		expect((await sharp(small.data).metadata()).width).toBe(300);

		const square = await optimizeImage(await png(1600, 1000, 1), {
			resize: { fit: 'square', size: IMAGE_LIMITS.squareSize },
			format: 'jpg'
		});
		const meta = await sharp(square.data).metadata();
		expect([meta.width, meta.height]).toEqual([IMAGE_LIMITS.squareSize, IMAGE_LIMITS.squareSize]);
	});

	it('crops squares even when a side is shorter than the square size', async () => {
		const result = await optimizeImage(await png(1000, 600, 0.5), {
			resize: { fit: 'square', size: IMAGE_LIMITS.squareSize }
		});
		const meta = await sharp(result.data).metadata();
		expect([meta.width, meta.height]).toEqual([600, 600]);
		expect(result.extension).toBe('png');
	});

	it('drops EXIF metadata (e.g. GPS from phone photos)', async () => {
		const withExif = new Uint8Array(
			await sharp(await png(50, 50, 1))
				.jpeg()
				.withExif({ IFD0: { Copyright: 'secret-location' } })
				.toBuffer()
		);
		expect((await sharp(withExif).metadata()).exif).toBeDefined();

		const result = await optimizeImage(withExif);
		expect((await sharp(result.data).metadata()).exif).toBeUndefined();
	});
});

describe('image helpers', () => {
	it('detects real transparency only', async () => {
		expect(await hasTransparency(await png(10, 10, 1))).toBe(false);
		expect(await hasTransparency(await png(10, 10, 0))).toBe(true);
	});

	it('stores GIF and SVG as uploaded', () => {
		expect(keepsOriginal('image/gif')).toBe(true);
		expect(keepsOriginal('image/svg+xml')).toBe(true);
		expect(keepsOriginal('image/png')).toBe(false);
	});
});
