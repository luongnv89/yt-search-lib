/**
 * Typed errors thrown by yt-search-lib.
 *
 * Every error the library raises extends {@link YtSearchError}, so callers can
 * catch the base class or discriminate on a specific subclass:
 *
 * ```js
 * try {
 *   await client.search('lofi');
 * } catch (e) {
 *   if (e instanceof NetworkError) { ... }
 *   else if (e instanceof ParseError) { ... }
 * }
 * ```
 *
 * `name` is set explicitly per class (rather than derived from the
 * constructor) so it survives bundle minification.
 *
 * @module errors
 */

/** Base class for every error yt-search-lib throws. */
export class YtSearchError extends Error {
  /**
   * @param {string} message
   * @param {Object} [options] - Standard Error options (`cause`, …).
   */
  constructor(message, options) {
    super(message, options);
    this.name = 'YtSearchError';
  }
}

/**
 * Network-level failure: the request never produced a response —
 * DNS/TLS failure, refused connection, or an unreachable CORS proxy.
 */
export class NetworkError extends YtSearchError {
  constructor(message, options) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

/** The InnerTube response was not a recognizable search-results payload. */
export class ParseError extends YtSearchError {
  constructor(message, options) {
    super(message, options);
    this.name = 'ParseError';
  }
}
