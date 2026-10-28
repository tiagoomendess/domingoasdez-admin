import { basename } from 'node:path';
import { eq } from 'drizzle-orm';
import {
	FB_GRAPH_URL,
	FB_GRAPH_VERSION,
	FB_PAGE_ACCESS_TOKEN,
	FB_PAGE_ID,
	FB_SYSTEM_USER_TOKEN,
	IG_USER_ID
} from '$app/env/private';
import { read } from '$app/server';
import { audit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db/index.ts';
import { articles, media } from '#lib/server/db/schema.ts';
import { logger } from '#lib/server/log.ts';
import { articlePicturePath, renderArticlePost } from '../../../worker/images/article-post.ts';
import { registerFonts } from '../../../worker/images/draw.ts';
import { loadImage } from '../../../worker/images/sources.ts';
import { createSocialPoster, GraphError } from '../../../worker/social/graph.ts';
// The admin's build has no worker assets folder: these are bundled and read with `read()`.
import regularFont from '../../../worker/assets/fonts/Roboto-Regular.ttf';
import blackFont from '../../../worker/assets/fonts/Roboto-Black.ttf';
import template from '../../../worker/assets/images/article_post_base.png';
import { facebookCaption } from './form.ts';
import type { Article } from './index.ts';

const log = logger.child('articles:facebook');

/** Legacy `/images/16_9_placeholder_<n>.jpg` paths → their bundled copies. */
const placeholders: Record<string, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>('../../../worker/assets/images/16_9_placeholder_*.jpg', {
			eager: true,
			import: 'default'
		})
	).map(([path, asset]) => [`/images/${basename(path)}`, asset])
);

const bundled = async (asset: string) => new Uint8Array(await read(asset).arrayBuffer());

let fonts: Promise<void> | undefined;
function loadFonts() {
	fonts ??= Promise.all([bundled(regularFont), bundled(blackFont)])
		.then(([regular, black]) => registerFonts({ regular, black }))
		.catch((error) => {
			fonts = undefined;
			throw error;
		});
	return fonts;
}

/**
 * Legacy `ArticleController::createArticleSocialImage()`: the 1080×1350 JPEG with the title and the
 * cover (any media, visible or not, as legacy's `$article->media`).
 */
export async function renderArticleSocialImage(article: Pick<Article, 'id' | 'title' | 'mediaId'>) {
	const [cover] = article.mediaId
		? await db
				.select({ mediaType: media.mediaType, url: media.url, thumbnailUrl: media.thumbnailUrl })
				.from(media)
				.where(eq(media.id, article.mediaId))
				.limit(1)
		: [];
	const path = articlePicturePath(article.id, cover ?? null);
	const [picture, base] = await Promise.all([
		placeholders[path] ? bundled(placeholders[path]) : loadImage(path),
		bundled(template),
		loadFonts()
	]);
	return renderArticlePost({ template: base, title: article.title, picture });
}

export type FacebookPostResult =
	/** `saveError`: posted, but `facebook_post_id` could not be written (it must not be posted again). */
	| { posted: true; postId: string; saveError?: string }
	/** `busy`: already being posted; `image`: nothing was sent; `rejected`: Facebook refused it. */
	| { posted: false; reason: 'busy' | 'image' | 'rejected'; error?: string }
	/** No answer from Facebook (timeout, dropped connection, gateway error): it may be posted. */
	| { posted: false; reason: 'unknown'; error: string };

/** Articles being posted right now: a second click must not post twice (one PM2 instance). */
const posting = new Set<number>();

const errorText = (error: unknown) => {
	if (!(error instanceof Error)) return String(error);
	const cause = error.cause as { code?: string } | undefined;
	return cause?.code ? `${error.message} (${cause.code})` : error.message;
};

/**
 * Legacy `ArticleController@postOnFacebook`: posts the article's picture to the Facebook page
 * (uploaded as a file) with the caption, then keeps the post id in `articles.facebook_post_id`,
 * which allows a single post per article. Legacy also tried to comment the article's link, which
 * the page's permissions never allowed: the link is commented by hand.
 */
export async function postArticleOnFacebook(
	article: Article,
	message: string | null
): Promise<FacebookPostResult> {
	if (posting.has(article.id)) return { posted: false, reason: 'busy' };
	posting.add(article.id);
	try {
		let image: Uint8Array;
		try {
			image = await renderArticleSocialImage(article);
		} catch (error) {
			log.error(`article #${article.id}: could not generate the image`, error);
			return { posted: false, reason: 'image', error: errorText(error) };
		}

		const poster = createSocialPoster(
			{
				baseUrl: FB_GRAPH_URL,
				version: FB_GRAPH_VERSION,
				pageId: FB_PAGE_ID,
				pageToken: FB_PAGE_ACCESS_TOKEN,
				systemToken: FB_SYSTEM_USER_TOKEN,
				igUserId: IG_USER_ID
			},
			{ log }
		);
		let postId: string;
		try {
			postId = await poster.postToFacebookPhotoFile(
				image,
				`article_fb_post_${article.id}_${Math.floor(Date.now() / 1000)}.jpg`,
				facebookCaption(message, article.title)
			);
		} catch (error) {
			const rejected = error instanceof GraphError && error.rejected;
			log.error(`article #${article.id}: Facebook post failed`, error);
			return { posted: false, reason: rejected ? 'rejected' : 'unknown', error: errorText(error) };
		}

		log.info(`article #${article.id}: posted on Facebook as ${postId}`);
		try {
			await db.update(articles).set({ facebookPostId: postId }).where(eq(articles.id, article.id));
		} catch (error) {
			log.error(
				`article #${article.id}: posted as ${postId}, but the post id was not saved`,
				error
			);
			return { posted: true, postId, saveError: errorText(error) };
		}
		await audit({
			action: 'create',
			model: 'FacebookPost',
			newValues: { articleId: article.id, postId }
		});
		return { posted: true, postId };
	} finally {
		posting.delete(article.id);
	}
}
