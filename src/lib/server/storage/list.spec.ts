import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('./r2', () => ({ r2: () => ({ client: { send }, bucket: 'test-bucket' }) }));

const { listFiles } = await import('./index');

describe('listFiles', () => {
	beforeEach(() => send.mockReset());

	it('lists the direct children of a folder across pages', async () => {
		const date = new Date('2026-10-20T10:00:00Z');
		send
			.mockResolvedValueOnce({
				Contents: [
					{ Key: 'storage/tmp/', LastModified: date },
					{ Key: 'storage/tmp/a.jpg', LastModified: date }
				],
				IsTruncated: true,
				NextContinuationToken: 'next'
			})
			.mockResolvedValueOnce({ Contents: [{ Key: 'storage/tmp/b.jpg' }], IsTruncated: false });

		expect(await listFiles('/storage/tmp')).toEqual([
			{ url: '/storage/tmp/a.jpg', lastModified: date },
			{ url: '/storage/tmp/b.jpg', lastModified: null }
		]);

		const [first, second] = send.mock.calls.map(([command]) => command as ListObjectsV2Command);
		expect(first.input).toEqual({
			Bucket: 'test-bucket',
			Prefix: 'storage/tmp/',
			Delimiter: '/',
			ContinuationToken: undefined
		});
		expect(second.input.ContinuationToken).toBe('next');
	});

	it('accepts a trailing slash and refuses non-storage folders', async () => {
		send.mockResolvedValueOnce({ Contents: [], IsTruncated: false });
		expect(await listFiles('/storage/tmp/')).toEqual([]);
		expect((send.mock.calls[0][0] as ListObjectsV2Command).input.Prefix).toBe('storage/tmp/');
		await expect(listFiles('/images')).rejects.toThrow(/Not a storage URL/);
	});
});
