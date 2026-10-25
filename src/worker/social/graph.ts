import type { Logger } from '#lib/server/logger.ts';

/**
 * Port of the legacy `App\Services\SocialPoster`: the Facebook page and Instagram account
 * publishing calls of the Graph API, same endpoints and parameters. Publishing is two-phase for
 * stories and Instagram: the media is prepared ahead (`create…`), then published at the scheduled
 * time (`publish…`), see `publish-social-media`.
 */

export type GraphSettings = {
	/** `https://graph.facebook.com`; a fake Graph API in local tests (`FB_GRAPH_URL`). */
	baseUrl?: string;
	/** e.g. `v24.0`. */
	version: string;
	pageId: string | undefined;
	/** Facebook page posts and stories. */
	pageToken: string | undefined;
	/** Instagram (system user). */
	systemToken: string | undefined;
	igUserId: string | undefined;
};

export type GraphOptions = {
	log: Logger;
	fetch?: typeof fetch;
	sleep?: (ms: number) => Promise<void>;
};

type Params = Record<string, string | null | undefined>;
type GraphBody = Record<string, unknown> & { error?: { message?: string } };

export const GRAPH_URL = 'https://graph.facebook.com';
const TIMEOUT_MS = 30_000;
/** Legacy `waitForInstagramContainerReady()`: 5 checks, 2 s apart. */
const CONTAINER_CHECKS = 5;
const CONTAINER_CHECK_DELAY_MS = 2_000;

/**
 * A failed Graph call. `rejected`: the Graph API answered with an error (or a setting was missing
 * and nothing was sent), so the request created nothing and can be sent again. Without it (a
 * gateway's HTTP error without a Graph error, a reply without the expected id) the request may
 * have done its work. Timeouts and dropped connections reject with fetch's own errors.
 */
export class GraphError extends Error {
	constructor(
		message: string,
		readonly rejected = false
	) {
		super(message);
	}
}

/** Legacy `array_filter()`: drops empty values (used for the optional text post fields). */
const filled = (params: Params): Params =>
	Object.fromEntries(Object.entries(params).filter(([, value]) => value));

export function createSocialPoster(settings: GraphSettings, options: GraphOptions) {
	const request = options.fetch ?? fetch;
	const sleep = options.sleep ?? ((ms: number) => new Promise((done) => setTimeout(done, ms)));
	const { log } = options;
	const base = `${(settings.baseUrl ?? GRAPH_URL).replace(/\/+$/, '')}/${settings.version}/`;

	const required = (value: string | undefined, name: string) => {
		if (!value) throw new GraphError(`${name} is not configured`, true);
		return value;
	};
	const page = () => required(settings.pageId, 'FB_PAGE_ID');
	const pageToken = () => required(settings.pageToken, 'FB_PAGE_ACCESS_TOKEN');
	const ig = () => required(settings.igUserId, 'Instagram User ID (IG_USER_ID)');
	const systemToken = () => required(settings.systemToken, 'FB_SYSTEM_USER_TOKEN');

	async function parse(response: Response, endpoint: string): Promise<GraphBody> {
		const text = await response.text();
		let body: GraphBody = {};
		try {
			body = text ? (JSON.parse(text) as GraphBody) : {};
		} catch {
			// Not JSON: keep the status for the error below.
		}
		log.debug(`graph ${endpoint}: HTTP ${response.status} ${text.slice(0, 500)}`);
		if (!response.ok) {
			throw new GraphError(
				`Graph API request failed: ${body.error?.message ?? `HTTP ${response.status}`}`,
				Boolean(body.error)
			);
		}
		if (body.error) throw new GraphError(body.error.message ?? 'Graph API error', true);
		return body;
	}

	/**
	 * Legacy `makeGraphApiPost()`: form fields (null ones left out, as PHP's `http_build_query`
	 * does), or multipart with a file; a response with `error` throws its message.
	 */
	async function post(
		endpoint: string,
		params: Params,
		token: string,
		file?: { field: string; bytes: Uint8Array; filename: string }
	): Promise<GraphBody> {
		const fields = Object.entries({ ...params, access_token: token }).filter(
			(entry): entry is [string, string] => entry[1] !== null && entry[1] !== undefined
		);
		let body: URLSearchParams | FormData;
		if (file) {
			body = new FormData();
			body.append(file.field, new Blob([new Uint8Array(file.bytes)]), file.filename);
			for (const [name, value] of fields) body.append(name, value);
		} else {
			body = new URLSearchParams(fields);
		}
		log.debug(
			`graph POST ${endpoint} (${fields.map(([name]) => name).join(', ')}${file ? `, file ${file.filename}` : ''})`
		);
		const response = await request(base + endpoint, {
			method: 'POST',
			body,
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		return parse(response, endpoint);
	}

	async function get(endpoint: string, params: Record<string, string>): Promise<GraphBody> {
		const response = await request(`${base}${endpoint}?${new URLSearchParams(params)}`, {
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		return parse(response, endpoint);
	}

	const id = (body: GraphBody, key: string, failure: string) => {
		const value = body[key];
		if (typeof value !== 'string' && typeof value !== 'number') throw new GraphError(failure);
		return String(value);
	};

	/** Legacy `waitForInstagramContainerReady()`: until Instagram has processed the media. */
	async function waitForContainer(containerId: string) {
		for (let attempt = 1; attempt <= CONTAINER_CHECKS; attempt++) {
			let status: unknown;
			try {
				status = (await get(containerId, { fields: 'status_code', access_token: systemToken() }))
					.status_code;
			} catch (error) {
				log.warn(`container ${containerId}: status check ${attempt} failed`, error);
				if (attempt === CONTAINER_CHECKS) throw error;
				await sleep(CONTAINER_CHECK_DELAY_MS);
				continue;
			}
			if (status === 'FINISHED') return;
			// Legacy threw here but its own catch retried; a failed container never recovers.
			if (status === 'ERROR') throw new GraphError('Instagram container processing failed');
			if (attempt < CONTAINER_CHECKS) await sleep(CONTAINER_CHECK_DELAY_MS);
		}
		throw new GraphError('Instagram container did not become ready within the timeout period');
	}

	async function igContainer(params: Params, failure: string) {
		const body = await post(`${ig()}/media`, params, systemToken());
		return id(body, 'id', failure);
	}

	return {
		// ---- Facebook stories (two phases) ----

		/** Phase 1: upload the photo unpublished; returns the photo id. */
		async createFacebookStoryPhotoMedia(imageUrl: string): Promise<string> {
			const body = await post(
				`${page()}/photos`,
				{ url: imageUrl.trim(), published: 'false' },
				pageToken()
			);
			return id(body, 'id', 'Failed to upload photo for Facebook Story');
		},

		/** Phase 1: open a video story upload and send the file; returns the video id. */
		async createFacebookStoryVideoMedia(videoUrl: string): Promise<string> {
			const init = await post(`${page()}/video_stories`, { upload_phase: 'start' }, pageToken());
			const videoId = init.video_id;
			const uploadUrl = init.upload_url;
			if (
				typeof uploadUrl !== 'string' ||
				(typeof videoId !== 'string' && typeof videoId !== 'number')
			) {
				throw new GraphError('Failed to initialize Facebook Video Story upload session');
			}
			const download = await request(videoUrl.trim(), { signal: AbortSignal.timeout(TIMEOUT_MS) });
			if (!download.ok) {
				throw new GraphError(`Failed to download file from URL: HTTP ${download.status}`);
			}
			const video = new Uint8Array(await download.arrayBuffer());
			const upload = await request(uploadUrl, {
				method: 'POST',
				headers: { offset: '0', file_size: String(video.byteLength) },
				body: video,
				signal: AbortSignal.timeout(TIMEOUT_MS)
			});
			const result = await parse(upload, 'video upload');
			if (result.success !== true) {
				throw new GraphError(
					'Failed to upload video to Facebook: Video upload did not return success'
				);
			}
			return String(videoId);
		},

		/** Phase 2: publish the story photo; returns the post id. */
		async publishFacebookStoryPhoto(photoId: string): Promise<string> {
			const body = await post(`${page()}/photo_stories`, { photo_id: photoId }, pageToken());
			return id(body, 'post_id', 'Failed to publish Facebook Story Photo');
		},

		/** Phase 2: publish the story video; returns the post id. */
		async publishFacebookStoryVideo(videoId: string): Promise<string> {
			const body = await post(
				`${page()}/video_stories`,
				{ video_id: videoId, upload_phase: 'finish' },
				pageToken()
			);
			return id(body, 'post_id', 'Failed to publish Facebook Story Video');
		},

		// ---- Facebook posts ----

		/** A text post, with an optional link preview; returns the post id ('' when none). */
		async postToFacebookText(message: string | null, link: string | null = null) {
			const body = await post(`${page()}/feed`, filled({ message, link }), pageToken());
			return typeof body.id === 'string' ? body.id : '';
		},

		/** A photo post from a public URL; returns the post id ('' when none). */
		async postToFacebookPhoto(imageUrl: string, caption: string | null = null) {
			const body = await post(`${page()}/photos`, filled({ url: imageUrl, caption }), pageToken());
			return typeof body.post_id === 'string' ? body.post_id : '';
		},

		/** Legacy `postToFacebookPhotoFromFile()`: a photo post uploaded as a file. */
		async postToFacebookPhotoFile(
			bytes: Uint8Array,
			filename: string,
			caption: string | null = null
		) {
			const body = await post(`${page()}/photos`, { published: 'true', caption }, pageToken(), {
				field: 'source',
				bytes,
				filename
			});
			const postId = body.post_id ?? body.id;
			if (typeof postId !== 'string' || !postId) {
				throw new GraphError('Failed to get post ID from Facebook photo upload');
			}
			return postId;
		},

		/** A comment under a page post; returns the comment id. */
		async postCommentOnFacebookPost(postId: string, message: string): Promise<string> {
			const body = await post(`${postId}/comments`, { message }, pageToken());
			return id(body, 'id', 'Failed to post comment on Facebook post');
		},

		// ---- Instagram (two phases) ----

		createInstagramImageContainer(imageUrl: string, caption: string | null = null) {
			return igContainer(
				{ image_url: imageUrl.trim(), caption },
				'Failed to create Instagram image container'
			);
		},

		createInstagramReelContainer(videoUrl: string, caption: string | null = null) {
			return igContainer(
				{ media_type: 'REELS', video_url: videoUrl.trim(), caption },
				'Failed to create Instagram reel container'
			);
		},

		createInstagramStoryPhotoContainer(imageUrl: string) {
			return igContainer(
				{ media_type: 'STORIES', image_url: imageUrl.trim() },
				'Failed to create Instagram story photo container'
			);
		},

		createInstagramStoryVideoContainer(videoUrl: string) {
			return igContainer(
				{ media_type: 'STORIES', video_url: videoUrl.trim() },
				'Failed to create Instagram story video container'
			);
		},

		/** Phase 2: wait for Instagram to process the container, then publish it. */
		async publishInstagramContainer(containerId: string): Promise<string> {
			ig();
			await waitForContainer(containerId);
			const body = await post(`${ig()}/media_publish`, { creation_id: containerId }, systemToken());
			return id(body, 'id', 'Failed to publish Instagram container');
		}
	};
}

export type SocialPoster = ReturnType<typeof createSocialPoster>;
