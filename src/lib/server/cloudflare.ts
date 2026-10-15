/**
 * Cloudflare's Rocket Loader rewrites every `<script>` to load it later and re-inserts inline
 * scripts without their CSP nonce, so the browser blocks them and the app never hydrates (only
 * plain links work). Rocket Loader leaves scripts marked `data-cfasync="false"` alone.
 */
export function optOutOfRocketLoader(html: string): string {
	return html.replace(/<script(?![^>]*\bdata-cfasync=)/g, '<script data-cfasync="false"');
}
