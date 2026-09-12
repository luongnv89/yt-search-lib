/**
 * In-memory fixed-window rate limiter for the CORS proxy.
 *
 * Extracted from proxy-server.js so the rule can be unit-tested offline.
 * Entries live in a Map keyed by client identity (remote address); expired
 * windows are reset lazily on access, and the map is bounded by `maxKeys`
 * (oldest entries evicted first) so the limiter itself cannot be turned
 * into a memory-exhaustion vector.
 */
export class RateLimiter {
  /**
   * @param {Object} [options]
   * @param {number} [options.max=100] - Requests allowed per window per key.
   * @param {number} [options.windowMs=60000] - Window length in milliseconds.
   * @param {number} [options.maxKeys=10000] - Bound on tracked client keys.
   * @param {function} [options.now] - Clock injection for tests.
   */
  constructor({ max = 100, windowMs = 60000, maxKeys = 10000, now = () => Date.now() } = {}) {
    this.max = max;
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
    this.now = now;
    this.windows = new Map();
  }

  /**
   * Records a request for `key` and reports whether it is within the limit.
   * @param {string} key - Client identity (e.g. remote address).
   * @returns {boolean} true while the window count stays <= max.
   */
  allow(key) {
    const now = this.now();
    let entry = this.windows.get(key);
    if (!entry || now - entry.start >= this.windowMs) {
      entry = { start: now, count: 0 };
    }
    entry.count += 1;
    // Refresh insertion order: Map iterates oldest-first, so re-inserting
    // keeps the eviction frontier at the map head.
    this.windows.delete(key);
    this.windows.set(key, entry);
    this.#evict();
    return entry.count <= this.max;
  }

  /**
   * Milliseconds until `key`'s current window resets (for Retry-After).
   * @param {string} key
   * @returns {number}
   */
  retryAfterMs(key) {
    const entry = this.windows.get(key);
    if (!entry) {
      return 0;
    }
    return Math.max(0, this.windowMs - (this.now() - entry.start));
  }

  /**
   * Bound the map: drop expired windows first, then oldest entries.
   */
  #evict() {
    if (this.windows.size <= this.maxKeys) {
      return;
    }
    const now = this.now();
    for (const [key, entry] of this.windows) {
      if (this.windows.size <= this.maxKeys) {
        break;
      }
      if (now - entry.start >= this.windowMs) {
        this.windows.delete(key);
      }
    }
    while (this.windows.size > this.maxKeys) {
      const oldest = this.windows.keys().next().value;
      this.windows.delete(oldest);
    }
  }
}
