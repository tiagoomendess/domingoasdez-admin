import { describe, expect, it } from 'vitest';
import { optOutOfRocketLoader } from './cloudflare';

describe('optOutOfRocketLoader', () => {
	it('marks every script so Rocket Loader skips it', () => {
		const html =
			'<script nonce="abc">start()</script><script type="module" src="/a.js"></script><p>x</p>';
		expect(optOutOfRocketLoader(html)).toBe(
			'<script data-cfasync="false" nonce="abc">start()</script>' +
				'<script data-cfasync="false" type="module" src="/a.js"></script><p>x</p>'
		);
	});

	it('leaves scripts that already say what they want', () => {
		const html = '<script data-cfasync="true">x()</script>';
		expect(optOutOfRocketLoader(html)).toBe(html);
	});
});
