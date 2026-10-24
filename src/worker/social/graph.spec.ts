import { describe, expect, it, vi } from 'vitest';
import { recordingLogger } from '../test-helpers.ts';
import { createSocialPoster, type GraphSettings } from './graph.ts';

const settings: GraphSettings = {
	version: 'v24.0',
	pageId: 'PAGE',
	pageToken: 'page-token',
	systemToken: 'system-token',
	igUserId: 'IG'
};

type Call = { url: string; method: string; fields: Record<string, string>; headers?: unknown };

/** A fake Graph API answering each request with the next queued body (JSON) and status. */
function fakeGraph(...replies: [unknown, number?][]) {
	const calls: Call[] = [];
	const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
		const body = init?.body;
		const fields: Record<string, string> = {};
		if (body instanceof URLSearchParams) body.forEach((value, key) => (fields[key] = value));
		if (body instanceof FormData) {
			body.forEach((value, key) => (fields[key] = typeof value === 'string' ? value : '<file>'));
		}
		const target = String(url);
		if (!init?.method) new URL(target).searchParams.forEach((value, key) => (fields[key] = value));
		calls.push({
			url: target.split('?')[0],
			method: init?.method ?? 'GET',
			fields,
			headers: init?.headers
		});
		const [reply, status = 200] = replies.shift() ?? [{}];
		return new Response(JSON.stringify(reply), { status });
	});
	return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const poster = (graph: ReturnType<typeof fakeGraph>, sleep = vi.fn(async () => {})) =>
	createSocialPoster(settings, { log: recordingLogger(), fetch: graph.fetch, sleep });

const GRAPH = 'https://graph.facebook.com/v24.0';

describe('Facebook stories', () => {
	it('uploads the photo unpublished, then publishes it as a story', async () => {
		const graph = fakeGraph([{ id: '111' }], [{ post_id: 'P_1', success: true }]);
		const fb = poster(graph);

		expect(await fb.createFacebookStoryPhotoMedia(' https://cdn.test/a.jpg ')).toBe('111');
		expect(await fb.publishFacebookStoryPhoto('111')).toBe('P_1');
		expect(graph.calls).toEqual([
			{
				url: `${GRAPH}/PAGE/photos`,
				method: 'POST',
				fields: { url: 'https://cdn.test/a.jpg', published: 'false', access_token: 'page-token' },
				headers: undefined
			},
			{
				url: `${GRAPH}/PAGE/photo_stories`,
				method: 'POST',
				fields: { photo_id: '111', access_token: 'page-token' },
				headers: undefined
			}
		]);
	});

	it('uploads a video story in two steps and publishes it', async () => {
		const graph = fakeGraph(
			[{ video_id: 'V1', upload_url: 'https://rupload.test/V1' }],
			['VIDEO BYTES'],
			[{ success: true }],
			[{ post_id: 'P_2' }]
		);
		const fb = poster(graph);

		expect(await fb.createFacebookStoryVideoMedia('https://cdn.test/v.mp4')).toBe('V1');
		expect(await fb.publishFacebookStoryVideo('V1')).toBe('P_2');
		expect(graph.calls.map((call) => [call.method, call.url])).toEqual([
			['POST', `${GRAPH}/PAGE/video_stories`],
			['GET', 'https://cdn.test/v.mp4'],
			['POST', 'https://rupload.test/V1'],
			['POST', `${GRAPH}/PAGE/video_stories`]
		]);
		expect(graph.calls[0].fields).toEqual({ upload_phase: 'start', access_token: 'page-token' });
		expect(graph.calls[2].headers).toEqual({ offset: '0', file_size: '13' });
		expect(graph.calls[3].fields).toEqual({
			video_id: 'V1',
			upload_phase: 'finish',
			access_token: 'page-token'
		});
	});
});

describe('Facebook posts', () => {
	it('sends a text post, leaving out an empty link', async () => {
		const graph = fakeGraph([{ id: 'PAGE_9' }]);
		expect(await poster(graph).postToFacebookText('Olá', null)).toBe('PAGE_9');
		expect(graph.calls[0]).toMatchObject({
			url: `${GRAPH}/PAGE/feed`,
			fields: { message: 'Olá', access_token: 'page-token' }
		});
	});

	it('sends a photo post with its caption', async () => {
		const graph = fakeGraph([{ id: '5', post_id: 'PAGE_5' }]);
		expect(await poster(graph).postToFacebookPhoto('https://cdn.test/p.jpg', 'Legenda')).toBe(
			'PAGE_5'
		);
		expect(graph.calls[0].fields).toEqual({
			url: 'https://cdn.test/p.jpg',
			caption: 'Legenda',
			access_token: 'page-token'
		});
	});

	it('uploads a photo file as multipart', async () => {
		const graph = fakeGraph([{ id: '7', post_id: 'PAGE_7' }]);
		const id = await poster(graph).postToFacebookPhotoFile(new Uint8Array([1, 2]), 'a.jpg', null);
		expect(id).toBe('PAGE_7');
		expect(graph.calls[0].fields).toEqual({
			source: '<file>',
			published: 'true',
			access_token: 'page-token'
		});
	});
});

describe('Instagram', () => {
	it('creates containers with the legacy parameters (no caption when null)', async () => {
		const graph = fakeGraph([{ id: 'C1' }], [{ id: 'C2' }], [{ id: 'C3' }], [{ id: 'C4' }]);
		const ig = poster(graph);
		await ig.createInstagramImageContainer('https://cdn.test/i.jpg');
		await ig.createInstagramReelContainer('https://cdn.test/r.mp4', 'Reel');
		await ig.createInstagramStoryPhotoContainer('https://cdn.test/s.jpg');
		await ig.createInstagramStoryVideoContainer('https://cdn.test/s.mp4');
		expect(graph.calls.map((call) => call.fields)).toEqual([
			{ image_url: 'https://cdn.test/i.jpg', access_token: 'system-token' },
			{
				media_type: 'REELS',
				video_url: 'https://cdn.test/r.mp4',
				caption: 'Reel',
				access_token: 'system-token'
			},
			{ media_type: 'STORIES', image_url: 'https://cdn.test/s.jpg', access_token: 'system-token' },
			{ media_type: 'STORIES', video_url: 'https://cdn.test/s.mp4', access_token: 'system-token' }
		]);
		expect(new Set(graph.calls.map((call) => call.url))).toEqual(new Set([`${GRAPH}/IG/media`]));
	});

	it('waits for the container, then publishes it', async () => {
		const sleep = vi.fn(async () => {});
		const graph = fakeGraph(
			[{ status_code: 'IN_PROGRESS' }],
			[{ status_code: 'FINISHED' }],
			[{ id: 'MEDIA_1' }]
		);
		expect(await poster(graph, sleep).publishInstagramContainer('C1')).toBe('MEDIA_1');
		expect(sleep).toHaveBeenCalledOnce();
		expect(graph.calls.map((call) => [call.method, call.url, call.fields])).toEqual([
			['GET', `${GRAPH}/C1`, { fields: 'status_code', access_token: 'system-token' }],
			['GET', `${GRAPH}/C1`, { fields: 'status_code', access_token: 'system-token' }],
			['POST', `${GRAPH}/IG/media_publish`, { creation_id: 'C1', access_token: 'system-token' }]
		]);
	});

	it('stops at a failed container', async () => {
		const graph = fakeGraph([{ status_code: 'ERROR' }]);
		await expect(poster(graph).publishInstagramContainer('C1')).rejects.toThrow(
			'Instagram container processing failed'
		);
		expect(graph.calls).toHaveLength(1);
	});

	it('gives up after 5 checks', async () => {
		const sleep = vi.fn(async () => {});
		const graph = fakeGraph(
			...Array.from({ length: 5 }, () => [{ status_code: 'IN_PROGRESS' }] as [unknown])
		);
		await expect(poster(graph, sleep).publishInstagramContainer('C1')).rejects.toThrow(
			/did not become ready/
		);
		expect(sleep).toHaveBeenCalledTimes(4);
	});
});

describe('errors', () => {
	it('throws the Graph API error message', async () => {
		const graph = fakeGraph([{ error: { message: 'Invalid OAuth access token.' } }, 400]);
		await expect(poster(graph).postToFacebookText('x')).rejects.toThrow(
			'Graph API request failed: Invalid OAuth access token.'
		);
	});

	it('throws an error body even on HTTP 200', async () => {
		const graph = fakeGraph([{ error: { message: 'Something' } }]);
		await expect(poster(graph).createFacebookStoryPhotoMedia('u')).rejects.toThrow('Something');
	});

	it('requires the account settings', async () => {
		const fb = createSocialPoster(
			{ ...settings, igUserId: undefined, pageToken: undefined },
			{ log: recordingLogger(), fetch: fakeGraph().fetch }
		);
		await expect(fb.createInstagramImageContainer('u')).rejects.toThrow(/IG_USER_ID/);
		await expect(fb.postToFacebookText('x')).rejects.toThrow(/FB_PAGE_ACCESS_TOKEN/);
	});

	it('marks a Graph error answer as rejected, not a gateway error', async () => {
		const refused = fakeGraph([{ error: { message: 'Invalid' } }, 400]);
		await expect(poster(refused).postToFacebookText('x')).rejects.toMatchObject({ rejected: true });
		const gateway = fakeGraph(['<html>Bad Gateway</html>', 502]);
		await expect(poster(gateway).postToFacebookText('x')).rejects.toMatchObject({
			message: 'Graph API request failed: HTTP 502',
			rejected: false
		});
	});
});
