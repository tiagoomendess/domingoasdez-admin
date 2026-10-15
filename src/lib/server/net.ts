import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * True for addresses on the public internet. The server fetches URLs typed by admins (media
 * links, YouTube thumbnails), so it must not be pointed at itself or the private network.
 */
export function isPublicAddress(address: string): boolean {
	const version = isIP(address);
	if (version === 4) {
		const [a, b] = address.split('.').map(Number);
		return !(
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 100 && b >= 64 && b <= 127) ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168) ||
			a >= 224
		);
	}
	if (version === 6) {
		const value = address.toLowerCase();
		if (value.startsWith('::ffff:')) return isPublicAddress(value.slice(7));
		return !(
			value === '::' ||
			value === '::1' ||
			value.startsWith('fc') ||
			value.startsWith('fd') ||
			value.startsWith('fe8') ||
			value.startsWith('fe9') ||
			value.startsWith('fea') ||
			value.startsWith('feb') ||
			value.startsWith('ff')
		);
	}
	return false;
}

export class RemoteFetchError extends Error {}

/**
 * Downloads a public http(s) URL with a size cap and a timeout. Redirects are followed by hand so
 * every hop is checked. (A DNS answer could still change between the check and the request; this
 * only serves admins, so the check is about mistakes and casual probing, not a hostile resolver.)
 */
export async function fetchPublicUrl(
	url: string,
	{
		maxBytes,
		timeoutMs = 10_000,
		redirects = 3
	}: { maxBytes: number; timeoutMs?: number; redirects?: number }
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
	let current = new URL(url);
	for (let hop = 0; hop <= redirects; hop++) {
		if (current.protocol !== 'https:' && current.protocol !== 'http:') {
			throw new RemoteFetchError(`Unsupported protocol: ${current.protocol}`);
		}
		const host = current.hostname.replace(/^\[|\]$/g, '');
		const addresses = isIP(host)
			? [host]
			: (await lookup(host, { all: true })).map((a) => a.address);
		if (!addresses.length || !addresses.every(isPublicAddress)) {
			throw new RemoteFetchError(`Not a public address: ${current.hostname}`);
		}

		const response = await fetch(current, {
			redirect: 'manual',
			signal: AbortSignal.timeout(timeoutMs),
			headers: { 'user-agent': 'DomingoAsDezAdmin/1.0' }
		});
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) throw new RemoteFetchError('Redirect without location');
			current = new URL(location, current);
			continue;
		}
		if (!response.ok || !response.body) throw new RemoteFetchError(`HTTP ${response.status}`);
		const declared = Number(response.headers.get('content-length') ?? 0);
		if (declared > maxBytes) throw new RemoteFetchError('Too large');

		const chunks: Uint8Array[] = [];
		let size = 0;
		for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
			size += chunk.length;
			if (size > maxBytes) throw new RemoteFetchError('Too large');
			chunks.push(chunk);
		}
		const bytes = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.length;
		}
		return { bytes, contentType: response.headers.get('content-type') };
	}
	throw new RemoteFetchError('Too many redirects');
}
