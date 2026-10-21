import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		enhancedImages(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// scripts/deploy.sh builds into build.next while build/ keeps serving.
			adapter: adapter({ out: process.env.BUILD_DIR || 'build' }),
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// Svelte transitions, Flowbite and Leaflet set inline style attributes.
					'style-src': ['self', 'unsafe-inline'],
					// Media comes from R2 (CDN), the legacy site and OpenStreetMap tiles.
					'img-src': ['self', 'data:', 'blob:', 'https:', 'http://localhost:*'],
					// Uploaded videos (media library, article bodies) come from the same origins.
					'media-src': ['self', 'blob:', 'https:', 'http://localhost:*'],
					'font-src': ['self', 'data:'],
					'connect-src': ['self'],
					// YouTube previews in the media library.
					'frame-src': ['https://www.youtube-nocookie.com'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// Admin URLs stay unprefixed; the language follows a cookie, then the browser.
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				// Pre-bundle the UI libraries up front: discovering them mid-run reloads the test page.
				optimizeDeps: { include: ['flowbite-svelte', 'flowbite-svelte-icons'] },
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
