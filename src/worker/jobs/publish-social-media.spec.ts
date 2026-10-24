import { describe, expect, it, vi } from 'vitest';
import { GraphError, type SocialPoster } from '../social/graph.ts';
import {
	prepareCall,
	publishCall,
	isRejected,
	publishFailure,
	splitLink,
	type SocialPost
} from './publish-social-media.rules.ts';

/** A poster whose every method records its name and arguments. */
function recorder() {
	const calls: [string, unknown[]][] = [];
	const poster = new Proxy(
		{},
		{
			get: (_target, name: string) =>
				vi.fn(async (...args: unknown[]) => {
					calls.push([name, args]);
					return `${name}-id`;
				})
		}
	) as SocialPoster;
	return { poster, calls };
}

const post = (overrides: Partial<SocialPost>): SocialPost => ({
	id: 1,
	platform: 'facebook',
	postType: 'post',
	postContentType: 'image',
	mediaPath: 'https://cdn.test/a.jpg',
	textContent: 'Legenda',
	mediaExternalId: null,
	...overrides
});

describe('splitLink', () => {
	it('takes the first link out of the message, like legacy', () => {
		expect(
			splitLink('🔴 Acompanha aqui todos os resultados em direto ⤵️ https://domingoasdez.com/jogos')
		).toEqual({
			message: '🔴 Acompanha aqui todos os resultados em direto ⤵️ ',
			link: 'https://domingoasdez.com/jogos'
		});
		expect(splitLink('a https://x.test/1 b https://x.test/2')).toEqual({
			message: 'a  b ',
			link: 'https://x.test/1'
		});
		expect(splitLink('Sem links')).toEqual({ message: 'Sem links', link: null });
		expect(splitLink(null)).toEqual({ message: null, link: null });
	});
});

describe('prepareCall', () => {
	const prepared = async (overrides: Partial<SocialPost>) => {
		const { poster, calls } = recorder();
		const step = prepareCall(post(overrides), poster);
		if (step.kind === 'call') await step.run();
		return { kind: step.kind, calls };
	};

	it('needs nothing for Facebook posts', async () => {
		expect((await prepared({})).kind).toBe('none');
		expect((await prepared({ postContentType: 'text' })).kind).toBe('none');
	});

	it('uploads Facebook story media', async () => {
		expect((await prepared({ postType: 'story' })).calls).toEqual([
			['createFacebookStoryPhotoMedia', ['https://cdn.test/a.jpg']]
		]);
		expect((await prepared({ postType: 'story', postContentType: 'video' })).calls[0][0]).toBe(
			'createFacebookStoryVideoMedia'
		);
	});

	it('creates Instagram containers, with the caption for posts', async () => {
		expect((await prepared({ platform: 'instagram' })).calls).toEqual([
			['createInstagramImageContainer', ['https://cdn.test/a.jpg', 'Legenda']]
		]);
		expect((await prepared({ platform: 'instagram', postContentType: 'video' })).calls[0][0]).toBe(
			'createInstagramReelContainer'
		);
		expect((await prepared({ platform: 'instagram', postType: 'story' })).calls).toEqual([
			['createInstagramStoryPhotoContainer', ['https://cdn.test/a.jpg']]
		]);
		expect(
			(await prepared({ platform: 'instagram', postType: 'story', postContentType: 'video' }))
				.calls[0][0]
		).toBe('createInstagramStoryVideoContainer');
	});

	it('cannot prepare text stories or Instagram text', async () => {
		expect((await prepared({ postType: 'story', postContentType: 'text' })).kind).toBe('invalid');
		expect((await prepared({ platform: 'instagram', postContentType: 'text' })).kind).toBe(
			'invalid'
		);
	});
});

describe('publishCall', () => {
	const published = async (overrides: Partial<SocialPost>) => {
		const { poster, calls } = recorder();
		const step = publishCall(post(overrides), poster);
		if (step.kind === 'error') return { error: step.message, calls };
		return { result: await step.run(), calls };
	};

	it('posts Facebook text with its link as a link post', async () => {
		const { calls } = await published({
			postContentType: 'text',
			textContent: 'Acompanha em 🔗 https://domingoasdez.com/jogos'
		});
		expect(calls).toEqual([
			['postToFacebookText', ['Acompanha em 🔗 ', 'https://domingoasdez.com/jogos']]
		]);
	});

	it('posts Facebook photos with the caption', async () => {
		expect((await published({})).calls).toEqual([
			['postToFacebookPhoto', ['https://cdn.test/a.jpg', 'Legenda']]
		]);
	});

	it('marks a Facebook video post done without posting (never supported)', async () => {
		expect(await published({ postContentType: 'video' })).toEqual({ result: null, calls: [] });
	});

	it('publishes what was prepared for stories and Instagram', async () => {
		expect((await published({ postType: 'story', mediaExternalId: 'P1' })).calls).toEqual([
			['publishFacebookStoryPhoto', ['P1']]
		]);
		expect(
			(await published({ postType: 'story', postContentType: 'video', mediaExternalId: 'V1' }))
				.calls
		).toEqual([['publishFacebookStoryVideo', ['V1']]]);
		expect((await published({ platform: 'instagram', mediaExternalId: 'C1' })).calls).toEqual([
			['publishInstagramContainer', ['C1']]
		]);
	});

	it('fails a story or Instagram post that was not prepared (legacy crashed)', async () => {
		expect((await published({ platform: 'instagram' })).error).toMatch(/not prepared/);
		expect((await published({ postType: 'story' })).error).toMatch(/not prepared/);
		expect((await published({ postType: 'story', postContentType: 'text' })).error).toMatch(
			/Invalid post content type/
		);
	});
});

describe('publishFailure', () => {
	const fb = { platform: 'facebook' as const, errorMessage: null };
	const ig = { platform: 'instagram' as const, errorMessage: null };
	const failure = (rejected: boolean) => ({ message: 'x', notPrepared: false, rejected });

	it('tries both networks again when the Graph API answered with an error', () => {
		// Legacy marked a failed Facebook post published, so it was never tried again.
		expect(publishFailure(fb, failure(true))).toEqual({ errorMessage: 'x' });
		expect(publishFailure(ig, failure(true))).toEqual({ errorMessage: 'x' });
	});

	it('does not send a Facebook post twice after no answer', () => {
		const result = publishFailure(fb, failure(false));
		expect(result).toMatchObject({ published: true, postId: null });
		expect(result.errorMessage).toMatch(/^No answer from Facebook, not tried again .*: x$/);
		// A prepared Instagram container can't be published twice.
		expect(publishFailure(ig, failure(false))).toEqual({ errorMessage: 'x' });
	});

	it('keeps the preparation error when the media was not prepared', () => {
		const notPrepared = { message: 'not prepared', notPrepared: true, rejected: false };
		expect(publishFailure({ ...fb, errorMessage: 'Fake upload error' }, notPrepared)).toEqual({
			errorMessage: 'Fake upload error'
		});
		expect(publishFailure(fb, notPrepared)).toEqual({ errorMessage: 'not prepared' });
	});

	it('tells refused requests from ones without an answer', () => {
		expect(isRejected(new GraphError('Graph API request failed: x', true))).toBe(true);
		expect(isRejected(new GraphError('Graph API request failed: HTTP 502'))).toBe(false);
		expect(isRejected(new DOMException('The operation timed out', 'TimeoutError'))).toBe(false);
		expect(isRejected(new TypeError('fetch failed'))).toBe(false);
	});
});
