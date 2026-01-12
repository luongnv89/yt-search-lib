import { DEFAULT_API_KEY, DEFAULT_CLIENT_CONTEXT, INNERTUBE_BASE_URL, SEARCH_ENDPOINT } from './lib/constants.js';
import { LRUCache } from './lib/cache.js';
import { Transport } from './lib/transport.js';
import { parseSearchResults } from './lib/parser.js';

/**
 * Main Client for YouTube InnerTube Search.
 */
export class YouTubeClient {
  /**
   * @param {Object} options
   * @param {string} [options.apiKey] - Override default API key.
   * @param {Object} [options.clientContext] - Override default client context.
   * @param {string} [options.proxyUrl] - URL for CORS proxy.
   * @param {boolean} [options.useCache] - Enable/disable caching (default: true).
   * @param {number} [options.cacheMaxAge] - Cache max age in ms.
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || DEFAULT_API_KEY;
    this.context = { ...DEFAULT_CLIENT_CONTEXT, ...options.clientContext };
    
    this.transport = new Transport({
      proxyUrl: options.proxyUrl,
      fetch: options.fetch
    });

    if (options.useCache !== false) {
      this.cache = new LRUCache('yt_search_', options.cacheMaxAge);
    } else {
      this.cache = null;
    }
  }

  /**
   * Search for videos, channels, playlists.
   * @param {string} query - The search query.
   * @param {Object} [options] - Optional search options.
   * @param {number} [options.limit=5] - Maximum number of results to return.
   * @param {string} [options.type='video'] - Type of results ('video', 'channel', 'playlist', or 'all').
   * @returns {Promise<import('./lib/parser.js').VideoResult[]>}
   */
  async search(query, { limit = 5, type = 'video' } = {}) {
    if (!query) throw new Error('Query is required');

    const cacheKey = `${query}_${limit}_${type}`;
    // Check cache
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const url = `${INNERTUBE_BASE_URL}${SEARCH_ENDPOINT}?key=${this.apiKey}`;
    
    const body = {
      context: {
        client: this.context
      },
      query: query,
    };

    try {
      const rawData = await this.transport.post(url, body);
      let results = parseSearchResults(rawData);

      if (type !== 'all') {
        results = results.filter(item => item.type === type);
      }

      results = results.slice(0, limit);

      if (this.cache) {
        this.cache.set(cacheKey, results);
      }

      return results;
    } catch (error) {
      console.error('YouTube Search Error:', error);
      throw error;
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
