/**
 * Build script for yt-search-lib
 * Bundles all source files into a single ESM module for npm distribution.
 */

import { build } from 'esbuild';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const tscBin = require.resolve('typescript/bin/tsc');

async function buildPackage() {
  console.log('Building yt-search-lib...');

  // Build ESM bundle
  await build({
    entryPoints: ['./src/index.js'],
    outfile: './dist/index.js',
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ['es2020'],
    format: 'esm',
    platform: 'browser',
    banner: {
      js: `// yt-search-lib v${packageJson.version}\n// License: MIT\n`,
    },
  });

  // Build CJS bundle — backs the `require` export condition and `main`.
  // `dist/index.js` is ESM-only, so `require('yt-search-lib')` needs its own
  // artifact (`.cjs` is always CommonJS regardless of `"type": "module"`).
  await build({
    entryPoints: ['./src/index.js'],
    outfile: './dist/index.cjs',
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ['es2020'],
    format: 'cjs',
    platform: 'browser',
    banner: {
      js: `// yt-search-lib v${packageJson.version}\n// License: MIT\n`,
    },
  });

  // Generate TypeScript declarations from the JSDoc-annotated source
  // (F-DEAD-005). tsc emits `dist/index.d.ts` plus per-module files under
  // `dist/lib/`, so the published types are derived from `src/` and cannot
  // drift the way the hand-duplicated template here used to.
  execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.types.json'], { stdio: 'inherit' });

  console.log('Build complete! Output: dist/index.js, dist/index.cjs, dist/index.d.ts');
}

buildPackage().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
