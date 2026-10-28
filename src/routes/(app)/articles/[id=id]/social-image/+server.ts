import { error } from '@sveltejs/kit';
import { renderArticleSocialImage } from '#lib/server/articles/facebook.ts';
import { findArticle } from '#lib/server/articles/index.ts';
import { audit } from '#lib/server/audit.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import type { RequestHandler } from './$types';

/**
 * The picture "Post on Facebook" sends, previewed in its dialog. `?download` is the legacy
 * "generate social image" button: the same JPEG as an attachment, audited as a view like legacy.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	requirePermission('articles.create');
	const article = await findArticle(params.id);
	if (!article) error(404, { message: 'Not found' });

	const jpeg = await renderArticleSocialImage(article);
	const download = url.searchParams.has('download');
	if (download) await audit({ action: 'view', model: 'ArticleSocialImage', newValues: article });

	return new Response(new Uint8Array(jpeg), {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'private, no-store',
			...(download && {
				'Content-Disposition': `attachment; filename="article-${article.id}-social.jpg"`
			})
		}
	});
};
