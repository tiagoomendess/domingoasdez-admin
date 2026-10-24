import { describe, expect, it } from 'vitest';
import {
	canRetry,
	parsePlatformFilter,
	parseStatusFilter,
	postErrors,
	postFormSchema,
	postStatus,
	type PostForm
} from './form';

const now = new Date('2026-10-24T10:00:00Z');
const future = new Date('2026-10-24T11:00:00Z');
const past = new Date('2026-10-24T09:00:00Z');

const post = (values: Partial<PostForm>): Omit<PostForm, 'publish_at'> => ({
	platform: 'facebook',
	post_type: 'post',
	post_content_type: 'image',
	media_path: null,
	image: null,
	text_content: null,
	...values
});
const context = { publishAt: future, now, timeChanged: true, hasMedia: true };
const fields = (errors: object) => Object.keys(errors).sort();

describe('postFormSchema', () => {
	it('accepts the post fields', () => {
		const result = postFormSchema.safeParse({
			platform: 'instagram',
			post_type: 'story',
			post_content_type: 'video',
			media_path: 'https://domingoasdez.com/storage/tmp/video.mp4',
			text_content: '',
			// The browser always posts the file input, empty when nothing was chosen.
			image: new File([], ''),
			publish_at: '2026-10-24T12:00'
		});
		expect(result.success).toBe(true);
	});

	it('takes media from any http(s) host, as mediaUrl() gives LocalStack ones locally', () => {
		const media = (media_path: string) =>
			postFormSchema.safeParse({
				platform: 'facebook',
				post_type: 'post',
				post_content_type: 'image',
				media_path,
				image: new File([], ''),
				publish_at: '2026-10-24T12:00'
			}).success;
		expect(media('http://localhost:4566/domingoasdez-dev/storage/social_media/a.jpg')).toBe(true);
		expect(media('ftp://domingoasdez.com/a.jpg')).toBe(false);
		expect(media('/storage/social_media/a.jpg')).toBe(false);
	});

	it('rejects unknown platforms, a bad date and long text', () => {
		const base = {
			platform: 'facebook',
			post_type: 'post',
			post_content_type: 'text',
			text_content: 'Olá',
			image: new File([], ''),
			publish_at: '2026-10-24T12:00'
		};
		expect(postFormSchema.safeParse({ ...base, platform: 'twitter' }).success).toBe(false);
		expect(postFormSchema.safeParse({ ...base, publish_at: '24/10/2026' }).success).toBe(false);
		expect(postFormSchema.safeParse({ ...base, text_content: 'x'.repeat(513) }).success).toBe(
			false
		);
	});
});

describe('postErrors', () => {
	it('accepts what publish-social-media can publish', () => {
		expect(postErrors(post({ text_content: 'Golo!' }), context)).toEqual({});
		expect(
			postErrors(
				post({ post_content_type: 'text', text_content: 'Resultados https://x.pt' }),
				context
			)
		).toEqual({});
		expect(postErrors(post({ platform: 'instagram', post_type: 'story' }), context)).toEqual({});
	});

	it('only allows text as a Facebook post, with text', () => {
		expect(
			fields(postErrors(post({ platform: 'instagram', post_content_type: 'text' }), context))
		).toEqual(['post_content_type']);
		expect(
			fields(postErrors(post({ post_type: 'story', post_content_type: 'text' }), context))
		).toEqual(['post_content_type']);
		expect(
			fields(postErrors(post({ post_content_type: 'text' }), { ...context, hasMedia: false }))
		).toEqual(['text_content']);
	});

	it('needs media for images and videos, and a URL for videos', () => {
		expect(fields(postErrors(post({}), { ...context, hasMedia: false }))).toEqual(['media_path']);
		const upload = new File([new Uint8Array(4)], 'video.png', { type: 'image/png' });
		expect(
			fields(postErrors(post({ post_content_type: 'video', image: upload }), context))
		).toEqual(['image']);
	});

	it('refuses text on stories', () => {
		expect(fields(postErrors(post({ post_type: 'story', text_content: 'Olá' }), context))).toEqual([
			'text_content'
		]);
	});

	it('needs a future time only when it is new or moved', () => {
		expect(fields(postErrors(post({}), { ...context, publishAt: past }))).toEqual(['publish_at']);
		expect(postErrors(post({}), { ...context, publishAt: past, timeChanged: false })).toEqual({});
	});
});

describe('postStatus', () => {
	const row = {
		published: false,
		postId: null,
		errorMessage: null,
		mediaExternalId: null,
		publishAt: future
	};

	it('tells scheduled, prepared and published posts apart', () => {
		expect(postStatus(row, now)).toBe('scheduled');
		expect(postStatus({ ...row, mediaExternalId: '1789' }, now)).toBe('prepared');
		expect(postStatus({ ...row, published: true, publishAt: past }, now)).toBe('published');
	});

	it('shows a failed attempt as failed until a retry succeeds', () => {
		expect(postStatus({ ...row, errorMessage: 'Graph error' }, now)).toBe('failed');
		// Legacy marked a failed Facebook post published, without a network id.
		expect(postStatus({ ...row, published: true, errorMessage: 'Graph error' }, now)).toBe(
			'failed'
		);
		// A retry published it: the earlier error stays in the row.
		expect(
			postStatus({ ...row, published: true, postId: '1797', errorMessage: 'Graph error' }, now)
		).toBe('published');
	});

	it('is missed once the publish window (5 minutes) has passed', () => {
		const late = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
		expect(postStatus({ ...row, publishAt: late(4) }, now)).toBe('scheduled');
		expect(postStatus({ ...row, publishAt: late(6) }, now)).toBe('missed');
	});

	it('only retries failed and missed posts', () => {
		expect(canRetry('failed')).toBe(true);
		expect(canRetry('missed')).toBe(true);
		expect(canRetry('published')).toBe(false);
		expect(canRetry('scheduled')).toBe(false);
	});
});

describe('filters', () => {
	it('reads known values only', () => {
		expect(parseStatusFilter(new URL('http://x/?status=failed'))).toBe('failed');
		expect(parseStatusFilter(new URL('http://x/?status=nope'))).toBeNull();
		expect(parsePlatformFilter(new URL('http://x/?platform=instagram'))).toBe('instagram');
		expect(parsePlatformFilter(new URL('http://x/'))).toBeNull();
	});
});
