# API Reference

The `YouTubeClient` class is the primary interface for the library.

## `YouTubeClient`

### Constructor

```javascript
import YouTubeClient from 'youtube-search';

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

- Throws an `Error` if the `query` parameter is missing.
- Throws network-related errors if the request fails or if the CORS proxy is unreachable.
- Errors are logged to the console before being re-thrown.

---

### `clearCache()`

Clears all stored search results from the browser's `localStorage` within the library's namespace.

```javascript
client.clearCache();
```

---

## Data Types

### `VideoResult` (Typedef)

```javascript
/**
 * @typedef {Object} VideoResult
 * @property {string} id
 * @property {string} type - 'video', 'playlist', 'channel'
 * @property {string} title
 * @property {string} link
 * @property {string} thumbnail_url
 * @property {string} author
 * @property {string} duration
 * @property {string} publishedAt
 * @property {string} viewCount
 */
```
