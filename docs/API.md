# API Reference

The `YouTubeClient` class is the primary interface for the library.

## `YouTubeClient`

### Constructor

```javascript
import YouTubeClient from 'yt-search-lib';

const client = new YouTubeClient(options);
```

#### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | *(Embedded)* | Override the default InnerTube API key. |
| `clientContext` | `Object` | `DEFAULT_CLIENT_CONTEXT` | Override the InnerTube client context (version, name, etc.). |
| `proxyUrl` | `string` | `''` | A prefix URL for a CORS proxy (e.g., `https://api.allorigins.win/raw?url=`). |
| `useCache` | `boolean` | `true` | Whether to enable LocalStorage-based LRU caching. |
| `cacheMaxAge` | `number` | `3600000` | Maximum age of cache entries in milliseconds (default 1 hour). |
| `fetch` | `function` | `globalThis.fetch` | Custom fetch implementation (useful for Node.js or testing). |

---

### `search(query, options)`

Performs a search for videos, channels, or playlists on YouTube.

#### Parameters

- **`query`** (`string`, *Required*): The search term.
- **`options`** (`Object`, *Optional*):
  - `limit` (`number`): Maximum number of results to return. Default is `5`.
  - `type` (`string`): The type of results to filter for. Options: `'video'`, `'channel'`, `'playlist'`, or `'all'`. Default is `'video'`.

#### Return Value

Returns a `Promise<Array<Object>>`. Each object in the array contains:

| Property | Type | Description |
| :--- | :--- | :--- |
| `type` | `string` | `'video'`, `'channel'`, or `'playlist'`. |
| `id` | `string` | The unique ID for the item. |
| `title` | `string` | The title of the item. |
| `link` | `string` | Full YouTube URL. |
| `thumbnail_url`| `string` | URL of the highest resolution thumbnail. |
| `author` | `string` | Channel name (for videos and playlists). |
| `duration` | `string` | Video duration string (e.g., `"10:05"`). |
| `viewCount` | `string` | Number of views as a string (e.g., `"1.2M views"`). |
| `publishedAt` | `string` | When the video was uploaded (e.g., `"2 days ago"`). |

#### Error Handling

- Throws a `YtSearchError` if the `query` parameter is missing.
- Throws a `NetworkError` (a `YtSearchError`) when the request cannot reach the API — DNS/TLS failure, refused connection, or an unreachable CORS proxy.
- Throws a `YtSearchError` when the request times out or the API answers with a non-OK status.
- Throws a `ParseError` (a `YtSearchError`) when the response is not a recognizable search payload — distinguishable from a real empty result, which still resolves to `[]`.
- All three classes are exported from the package (`import { YtSearchError, NetworkError, ParseError } from 'yt-search-lib'`) and carry the original error on their `cause` property. Errors are re-thrown, never logged to the console.

---

### `clearCache()`

Clears all stored search results within the library's namespace — from `localStorage` in browsers, or from the in-memory fallback store elsewhere (e.g. Node.js).

```javascript
client.clearCache();
```

---

## Data Types

### `VideoResult` (Typedef)

```javascript
/**
 * @typedef {object} VideoResult
 * @property {'video'|'channel'|'playlist'} type
 * @property {string} id
 * @property {string} title
 * @property {Thumbnail[]} thumbnails
 * @property {string} [link] - Watch URL (videos only).
 * @property {string} [thumbnail_url] - Largest thumbnail URL (videos only).
 * @property {string} [author] - Channel name (videos and playlists).
 * @property {string} [duration] - Formatted length (videos only).
 * @property {string} [publishedAt] - Relative publish time (videos only).
 * @property {string} [viewCount] - Formatted view count (videos only).
 * @property {string[]} [badges] - Badge labels (videos only).
 * @property {string} [description] - Description snippet (channels only).
 * @property {string} [subscriberCount] - Formatted subscriber count (channels only).
 * @property {string} [videoCount] - Formatted video count (channels and playlists).
 */
```

## Advanced Exports

Beyond `YouTubeClient` and the error classes, the package entry point also
re-exports the building blocks for advanced use:

```javascript
import { parseSearchResults, Transport, LRUCache } from 'yt-search-lib';
```

- `parseSearchResults(response, [limit])` — normalize a raw InnerTube search
  response into `VideoResult[]` (throws `ParseError` on malformed payloads).
  Passing a positive `limit` stops the renderer walk early once that many
  results are collected — only when no post-filter applies.
- `Transport` — the fetch/proxy layer used by `YouTubeClient`.
- `LRUCache` — the storage-backed cache used by `YouTubeClient`.

Published types are generated from the source JSDoc at build time
(`npm run build` → `dist/index.d.ts`); `VideoResult`, `Thumbnail`,
`YouTubeClientOptions`, `SearchOptions`, and `ClientContext` are importable
as types:

```typescript
import type { VideoResult, YouTubeClientOptions } from 'yt-search-lib';
```
