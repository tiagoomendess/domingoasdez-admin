import { describe, expect, it } from 'vitest';
import { fetchPublicUrl, isPublicAddress, RemoteFetchError } from './net';

describe('isPublicAddress', () => {
	it('refuses loopback, private and link-local addresses', () => {
		for (const address of [
			'127.0.0.1',
			'10.1.2.3',
			'172.16.0.1',
			'172.31.255.255',
			'192.168.1.10',
			'169.254.169.254',
			'100.64.0.1',
			'0.0.0.0',
			'::1',
			'fd00::1',
			'fe80::1',
			'::ffff:127.0.0.1',
			'not-an-ip'
		]) {
			expect(isPublicAddress(address), address).toBe(false);
		}
	});

	it('accepts public addresses', () => {
		for (const address of ['8.8.8.8', '172.32.0.1', '142.250.200.14', '2a00:1450:4003::200e']) {
			expect(isPublicAddress(address), address).toBe(true);
		}
	});
});

describe('fetchPublicUrl', () => {
	it('never requests local addresses', async () => {
		await expect(fetchPublicUrl('http://127.0.0.1:3306/', { maxBytes: 10 })).rejects.toThrow(
			RemoteFetchError
		);
		await expect(fetchPublicUrl('http://localhost/', { maxBytes: 10 })).rejects.toThrow(
			RemoteFetchError
		);
		await expect(fetchPublicUrl('file:///etc/passwd', { maxBytes: 10 })).rejects.toThrow(
			RemoteFetchError
		);
	});
});
