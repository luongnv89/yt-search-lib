/**
 * Transport layer for handling HTTP requests to InnerTube API.
 * Handles fetch, proxying, and error normalization.
 * 
 * @module transport
 */

export class Transport {
  /**
   * @param {Object} config
   * @param {string} [config.proxyUrl] - Optional proxy URL (e.g. 'https://cors-anywhere.herokuapp.com/')
   * @param {function} [config.fetch] - Optional fetch polyfill/replacement
   * @param {Object} [config.headers] - Custom headers
   */
  constructor(config = {}) {
    this.proxyUrl = config.proxyUrl || '';
    this.fetch = config.fetch || globalThis.fetch.bind(globalThis);
    this.headers = config.headers || {};
  }

  /**
   * Make a POST request to InnerTube.
   * @param {string} url - Full URL.
   * @param {Object} body - JSON body.
   * @returns {Promise<Object>} JSON response.
   */
  async post(url, body) {
    const targetUrl = this.proxyUrl ? `${this.proxyUrl}${url}` : url;
    
    // Some proxies require the target URL to be encoded, others don't.
    // Standard CORS proxies usually take the full URL as path.
    // If the proxy simply forwards, we might need to handle headers carefully.

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...this.headers,
    };

    try {
      const response = await this.fetch(targetUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      // Enhance error message
      if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Failed to connect. Check your internet connection or proxy settings.');
      }
      throw error;
    }
  }
}
