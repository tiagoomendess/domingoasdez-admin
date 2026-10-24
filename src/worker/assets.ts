import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Fonts and images the jobs draw with (`assets/README.md`): `src/worker/assets` when running
 * from source (tests), `build/worker/assets` in the build (copied by vite.worker.config.ts, next to
 * the bundled `index.js`).
 */
export const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'assets');

export const assetPath = (...segments: string[]) => join(ASSETS_DIR, ...segments);
