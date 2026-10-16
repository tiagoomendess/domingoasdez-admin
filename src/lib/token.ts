const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Random letters and digits, like the legacy `Str::random(32)` (Web Crypto: browser and server). */
export function randomToken(length = 32): string {
	let token = '';
	while (token.length < length) {
		for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
			// 62 symbols: drop bytes ≥ 248 so every symbol is equally likely.
			if (byte < 248) token += TOKEN_CHARS[byte % 62];
			if (token.length === length) break;
		}
	}
	return token;
}
