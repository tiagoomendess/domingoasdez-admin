import { eq } from 'drizzle-orm';
import type { Database, Transaction } from '#lib/server/db/index.ts';
import { media } from '#lib/server/db/schema.ts';
import type { StoredImage } from '#lib/server/storage/uploads.ts';

/**
 * Like the legacy controllers, uploaded pictures (emblems, …) are also added to the media library
 * (`media` table, with thumbnail) so editors can reuse them in articles. Returns the new row for
 * the audit log.
 */
export async function insertImageMedia(
	tx: Transaction,
	{ userId, image, tags }: { userId: number; image: StoredImage; tags: string[] }
) {
	const [{ id }] = await tx
		.insert(media)
		.values({
			userId,
			url: image.url,
			thumbnailUrl: image.thumbnailUrl,
			mediaType: 'image',
			tags: tags.join(',')
		})
		.$returningId();
	const [row] = await tx.select().from(media).where(eq(media.id, id));
	return row;
}

/** True when a stored file is still used by the media library (legacy uploads always are). */
export async function isInMediaLibrary(executor: Database | Transaction, url: string) {
	const [row] = await executor
		.select({ id: media.id })
		.from(media)
		.where(eq(media.url, url))
		.limit(1);
	return Boolean(row);
}
