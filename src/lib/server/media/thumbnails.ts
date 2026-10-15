import sharp, { type Sharp } from 'sharp';
import { fetchPublicUrl } from '#lib/server/net.ts';
import { IMAGE_LIMITS } from '#lib/server/storage/images.ts';
import { thumbnailLabel, youtubeId, type MediaType } from './form';

/**
 * Port of the legacy `Media::generateThumbnail()`: a JPEG at most 900 px wide.
 * - image: the picture itself
 * - youtube: the video's YouTube thumbnail with a play button on top
 * - anything else: a blue square with the last three letters of the URL (e.g. `MP4`, `PDF`)
 */
const WIDTH = 900;
/** Remote pictures (image links, YouTube thumbnails) are downloaded up to this size. */
const REMOTE_MAX_BYTES = 20 * 1024 * 1024;
const BLUE = '#107db7';

async function toJpeg(input: Uint8Array | Sharp) {
	const image = input instanceof Uint8Array ? sharp(input, { animated: false }) : input;
	return new Uint8Array(
		await image
			.rotate()
			.resize({ width: WIDTH, withoutEnlargement: true })
			.flatten({ background: '#ffffff' })
			.jpeg({ quality: IMAGE_LIMITS.generatedQuality, progressive: true, mozjpeg: true })
			.toBuffer()
	);
}

/** The legacy `play_button.png`: a dark translucent circle with a white triangle. */
function playButton(size: number) {
	const r = size / 2;
	return Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
			`<circle cx="${r}" cy="${r}" r="${r - 2}" fill="rgba(0,0,0,0.6)" stroke="white" stroke-width="4"/>` +
			`<polygon points="${r * 0.78},${r * 0.55} ${r * 0.78},${r * 1.45} ${r * 1.5},${r}" fill="white"/></svg>`
	);
}

async function youtubeThumbnail(url: string) {
	const id = youtubeId(url);
	if (!id) throw new Error('Not a YouTube video link');
	// `maxresdefault` does not exist for every video; `hqdefault` always does.
	let picture: Uint8Array | null = null;
	for (const name of ['maxresdefault', 'hqdefault']) {
		try {
			picture = (
				await fetchPublicUrl(`https://img.youtube.com/vi/${id}/${name}.jpg`, {
					maxBytes: REMOTE_MAX_BYTES
				})
			).bytes;
			break;
		} catch {
			// try the next size
		}
	}
	if (!picture) throw new Error('YouTube thumbnail not found');

	const resized = await sharp(picture)
		.resize({ width: WIDTH, withoutEnlargement: true })
		.toBuffer();
	const { width = WIDTH, height = 0 } = await sharp(resized).metadata();
	const size = Math.round(Math.min(width, height) * 0.35);
	return toJpeg(sharp(resized).composite([{ input: playButton(size), gravity: 'center' }]));
}

function labelThumbnail(url: string) {
	const label = thumbnailLabel(url);
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${WIDTH}">` +
		`<rect width="100%" height="100%" fill="${BLUE}"/>` +
		`<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" ` +
		`font-family="Roboto, Arial, Helvetica, sans-serif" font-weight="900" font-size="300">${label}</text></svg>`;
	return toJpeg(sharp(Buffer.from(svg)));
}

/**
 * Thumbnail of a media item. `bytes` is the uploaded file (images); linked images are downloaded.
 * Throws when it can't be made (e.g. a broken link), so the media item is not created.
 */
export async function makeThumbnail({
	type,
	url,
	bytes
}: {
	type: MediaType;
	url: string;
	bytes?: Uint8Array;
}): Promise<Uint8Array> {
	if (type === 'image') {
		const source = bytes ?? (await fetchPublicUrl(url, { maxBytes: REMOTE_MAX_BYTES })).bytes;
		return toJpeg(source);
	}
	if (type === 'youtube') return youtubeThumbnail(url);
	return labelThumbnail(url);
}
