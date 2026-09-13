/**
 * Build script for yt-search-lib
 * Bundles all source files into a single ESM module for npm distribution.
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

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
    outdir: undefined, // Use outfile instead
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

  // Generate TypeScript declaration file
  const declaration = `/**
 * Type definitions for yt-search-lib
 * Generated automatically - for reference only
 */

export as namespace YouTubeSearch;

export interface YouTubeClientOptions {
  apiKey?: string;
  clientContext?: {
    clientName: string;
    clientVersion: string;
    hl?: string;
    gl?: string;
    utcOffsetMinutes?: number;
  };
  proxyUrl?: string;
  useCache?: boolean;
  cacheMaxAge?: number;
  fetch?: typeof fetch;
}

export interface VideoResult {
  type: 'video' | 'channel' | 'playlist';
  id: string;
  title: string;
  link: string;
  thumbnail_url: string;
  thumbnails: Array<{ url: string; width: number; height: number }>;
  author: string;
  duration: string;
  publishedAt: string;
  viewCount: string;
  badges?: string[];
  description?: string;
  subscriberCount?: string;
  videoCount?: string;
}

export declare class YtSearchError extends Error {
  constructor(message?: string, options?: { cause?: unknown });
}

export declare class NetworkError extends YtSearchError {}

export declare class ParseError extends YtSearchError {}

export declare class YouTubeClient {
  constructor(options?: YouTubeClientOptions);
  search(query: string, options?: { limit?: number; type?: 'video' | 'channel' | 'playlist' | 'all' }): Promise<VideoResult[]>;
  clearCache(): void;
}

export default YouTubeClient;
`;

  writeFileSync('./dist/index.d.ts', declaration);
  console.log('Build complete! Output: dist/index.js, dist/index.cjs, dist/index.d.ts');
}

buildPackage().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
