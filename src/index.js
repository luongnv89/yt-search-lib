import {
  DEFAULT_API_KEY,
  DEFAULT_CLIENT_CONTEXT,
  INNERTUBE_BASE_URL,
  SEARCH_ENDPOINT,
} from './lib/constants.js';
import { LRUCache } from './lib/cache.js';
import { YtSearchError } from './lib/errors.js';
import { Transport } from './lib/transport.js';
import { parseSearchResults } from './lib/parser.js';

export { NetworkError, ParseError, YtSearchError } from './lib/errors.js';
export { LRUCache } from './lib/cache.js';
export { Transport } from './lib/transport.js';
export { parseSearchResults } from './lib/parser.js';

/**
 * The normalized search-result shape produced by the parser.
 * @typedef {import('./lib/parser.js').VideoResult} VideoResult
 */

/**
 * A thumbnail entry in a result's `thumbnail` list.
 * @typedef {import('./lib/parser.js').Thumbnail} Thumbnail
 */

/**
 * Client context override — merged over `DEFAULT_CLIENT_CONTEXT`.
 * @typedef {object} ClientContext
 * @property {string} [clientName]
 * @property {string} [clientVersion]
 * @property {string} [hl]
 * @property {string} [gl]
 * @property {number} [utcOffsetMinutes]
 */

/**
 * Options accepted by the {@link YouTubeClient} constructor.
 * @typedef {object} YouTubeClientOptions
 * @property {string} [apiKey] - Override default API key.
 * @property {ClientContext} [clientContext] - Override default client context.
 * @property {string} [proxyUrl] - URL for CORS proxy.
 * @property {boolean} [useCache] - Enable/disable caching (default: true).
 * @property {number} [cacheMaxAge] - Cache max age in ms.
 * @property {number} [timeout] - Request timeout in ms (default 30000).
 * @property {typeof fetch} [fetch] - Custom fetch implementation.
 */

/**
 * Options accepted by {@link YouTubeClient#search}.
 * @typedef {object} SearchOptions
 * @property {number} [limit=5] - Maximum number of results to return.
 * @property {'video'|'channel'|'playlist'|'all'} [type='video'] - Type of results to return.
 */

/**
 * Main Client for YouTube InnerTube Search.
 */
export class YouTubeClient {
  /**
   * @param {YouTubeClientOptions} [options]
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || DEFAULT_API_KEY;
    /** @type {ClientContext} */
    this.context = { ...DEFAULT_CLIENT_CONTEXT, ...options.clientContext };

    /** @type {Transport} */
    this.transport = new Transport({
      proxyUrl: options.proxyUrl,
      fetch: options.fetch,
      timeout: options.timeout,
    });

    /** @type {LRUCache|null} */
    this.cache = null;
    if (options.useCache !== false) {
      this.cache = new LRUCache('yt_search_', options.cacheMaxAge);
    }
  }

  /**
   * Search for videos, channels, playlists.
   * @param {string} query - The search query.
   * @param {SearchOptions} [options] - Optional search options.
   * @returns {Promise<VideoResult[]>}
   */
  async search(query, { limit = 5, type = 'video' } = {}) {
    if (!query) throw new YtSearchError('Query is required');

    // JSON-encoding the parameter tuple keeps the key unambiguous: a
    // '_'-joined string collides when a parameter itself contains '_'.
    const cacheKey = JSON.stringify([query, limit, type]);
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const url = `${INNERTUBE_BASE_URL}${SEARCH_ENDPOINT}?key=${this.apiKey}`;

    const body = {
      context: {
        client: this.context,
      },
      query: query,
    };

    try {
      const rawData = await this.transport.post(url, body);
      let results = parseSearchResults(rawData);

      if (type !== 'all') {
        results = results.filter((item) => item.type === type);
      }

      results = results.slice(0, limit);

      if (this.cache) {
        this.cache.set(cacheKey, results);
      }

      return results;
    } catch (error) {
      // Rejections always carry a typed error: errors the library already
      // typed pass through untouched, anything else is wrapped.
      if (error instanceof YtSearchError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new YtSearchError(message, { cause: error });
    }
  }

  /**
   * Clear the search cache.
   */
  clearCache() {
    if (this.cache) {
      this.cache.clear();
    }
  }
}

export default YouTubeClient;
