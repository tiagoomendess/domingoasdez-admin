import sharp from 'sharp';

/**
 * Port of the legacy App\Services\ImageOptimizer rules, so both apps store images the same way:
 * fix phone rotation, cap the size, drop EXIF (GPS) and pick a compact format.
 */
export const IMAGE_LIMITS = {
	/** Longest side of content images: media, playgrounds, partners, pages, logos. */
	contentMaxSize: 2048,
	/** Players, referees, team agents and club emblems (square crop). */
	squareSize: 800,
	/** User avatars. */
	avatarSize: 400,
	/** Uploaded photos. */
	jpegQuality: 82,
	/** Images the app generates itself (thumbnails). */
	generatedQuality: 80
} as const;

/** GD/sharp would lose the animation or cannot rasterise them faithfully: stored as uploaded. */
const KEEP_ORIGINAL = new Set(['image/gif', 'image/svg+xml']);

export type OptimizedImage = { data: Uint8Array; extension: string; contentType: string };

export type OptimizeOptions = {
	/** Fit inside a `maxSize` box (default) or crop to a `size` square. */
	resize?: { fit: 'inside'; maxSize: number } | { fit: 'square'; size: number };
	/** `jpg` for photos; omit to keep PNG only when the image has transparency (emblems, logos). */
	format?: 'jpg' | 'png';
	quality?: number;
};

export function keepsOriginal(contentType: string) {
	return KEEP_ORIGINAL.has(contentType);
}

export async function optimizeImage(
	input: Uint8Array,
	{
		resize = { fit: 'inside', maxSize: IMAGE_LIMITS.contentMaxSize },
		format,
		quality = IMAGE_LIMITS.jpegQuality
	}: OptimizeOptions = {}
): Promise<OptimizedImage> {
	// rotate() applies the EXIF orientation; metadata is not copied to the output.
	let pipeline = sharp(input, { failOn: 'error' }).rotate();

	if (resize.fit === 'square') {
		// Legacy `fit($size, $size)` with `upsize()`: crop the largest centred square, then only
		// scale it down. (`withoutEnlargement` alone would leave e.g. 1000x600 at 800x600.)
		const { width = resize.size, height = resize.size } = await sharp(input).metadata();
		const side = Math.min(resize.size, width, height);
		pipeline = pipeline.resize(side, side, { fit: 'cover' });
	} else {
		pipeline = pipeline.resize(resize.maxSize, resize.maxSize, {
			fit: 'inside',
			withoutEnlargement: true
		});
	}

	const target = format ?? ((await hasTransparency(input)) ? 'png' : 'jpg');

	if (target === 'png') {
		const data = await pipeline.png({ compressionLevel: 9 }).toBuffer();
		return { data: new Uint8Array(data), extension: 'png', contentType: 'image/png' };
	}

	// JPEG has no alpha: flatten onto white (GD would turn transparent pixels black).
	const data = await pipeline
		.flatten({ background: '#ffffff' })
		.jpeg({ quality, progressive: true, mozjpeg: true })
		.toBuffer();
	return { data: new Uint8Array(data), extension: 'jpg', contentType: 'image/jpeg' };
}

/** True when the image has an alpha channel that is actually used. */
export async function hasTransparency(input: Uint8Array): Promise<boolean> {
	const image = sharp(input);
	const { hasAlpha } = await image.metadata();
	if (!hasAlpha) return false;
	const { channels } = await image.stats();
	const alpha = channels[3];
	return alpha !== undefined && alpha.min < 255;
}
