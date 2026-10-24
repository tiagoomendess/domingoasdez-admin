// Bundles the background jobs worker (src/worker, docs/jobs.md) into <BUILD_DIR>/worker, next to
// the admin build, so scripts/deploy.sh swaps and rolls back both together. Runs after the admin
// build (`npm run build`): adapter-node empties BUILD_DIR first.
import { cpSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { variables } from './src/env.ts';

const PREFIX = '\0worker-env:';
/** Validated once, shared by both modules. */
const VALUES = `${PREFIX}values`;
const APP_ENV = fileURLToPath(new URL('./src/worker/app-env.ts', import.meta.url));

/**
 * `$app/env/private` and `$app/env/public` only exist inside SvelteKit. The worker gets the same
 * exports, validated from `process.env` once at startup with the src/env.ts definitions. Any other
 * `$app/*` module (`getRequestEvent()`, …) needs a request and fails the build.
 */
function appEnvModules(): Plugin {
	const modules: Record<string, boolean> = { '$app/env/private': false, '$app/env/public': true };

	return {
		name: 'worker-app-env',
		enforce: 'pre',
		resolveId(source) {
			if (source === VALUES) return VALUES;
			if (source in modules) return PREFIX + source;
			if (source === '$app' || source.startsWith('$app/')) {
				this.error(`${source} only exists inside SvelteKit: worker code cannot import it`);
			}
		},
		load(id) {
			if (id === VALUES) {
				return `import { readAppEnv } from ${JSON.stringify(APP_ENV)};\nexport const values = readAppEnv(process.env);`;
			}
			if (!id.startsWith(PREFIX)) return;
			const isPublic = modules[id.slice(PREFIX.length)];
			const exported = Object.entries(variables as Record<string, { public?: boolean }>)
				.filter(([, config]) => Boolean(config.public) === isPublic)
				.map(([name]) => `export const ${name} = values.${name};`);
			return [`import { values } from ${JSON.stringify(VALUES)};`, ...exported].join('\n');
		}
	};
}

/** Fonts and images the jobs draw with: src/worker/assets → <outDir>/assets (src/worker/assets.ts). */
function copyAssets(): Plugin {
	let outDir = '';
	return {
		name: 'worker-assets',
		configResolved(config) {
			outDir = config.build.outDir;
		},
		writeBundle() {
			cpSync(
				fileURLToPath(new URL('./src/worker/assets', import.meta.url)),
				join(outDir, 'assets'),
				{
					recursive: true,
					filter: (source) => !source.endsWith('README.md')
				}
			);
		}
	};
}

export default defineConfig({
	plugins: [appEnvModules(), copyAssets()],
	publicDir: false,
	build: {
		ssr: 'src/worker/main.ts',
		outDir: `${process.env.BUILD_DIR || 'build'}/worker`,
		emptyOutDir: true,
		sourcemap: true,
		rolldownOptions: { output: { entryFileNames: 'index.js' } }
	},
	// Dependencies stay in node_modules, like the admin build; @sveltejs/kit is a devDependency
	// (only its tiny `defineEnvVars` is used, by src/env.ts), so it goes into the bundle.
	ssr: { noExternal: ['@sveltejs/kit'] }
});
