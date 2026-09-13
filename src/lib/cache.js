/**
 * Simple LRU (Least Recently Used) Cache.
 *
 * Persists entries in `localStorage` where available (browsers) and falls back
 * to a shared in-memory store where Web Storage is missing or unusable
 * (Node.js, sandboxed frames, disabled storage).
 *
 * @module cache
 */

/**
 * Minimal Storage-compatible backend backed by a `Map`.
 * Used when no real `localStorage` is available.
 */
class MemoryStorage {
  constructor() {
    /** @type {Map<string, string>} */
    this._map = new Map();
  }

  /**
   * @param {string} key
   * @returns {string|null}
   */
  getItem(key) {
    return this._map.has(key) ? this._map.get(key) : null;
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  setItem(key, value) {
    this._map.set(key, String(value));
  }

  /**
   * @param {string} key
   */
  removeItem(key) {
    this._map.delete(key);
  }
}

// A single process-wide fallback, mirroring the single shared `localStorage`.
const memoryStorage = new MemoryStorage();

/**
 * Return a usable Web Storage backend, or the in-memory fallback.
 * Probes with a real write because some environments expose a `localStorage`
 * object whose accessors throw (private mode, denied storage, Node without
 * `--localstorage-file`).
 *
 * @returns {Storage|MemoryStorage}
 */
function resolveStorage() {
  try {
    const store = globalThis.localStorage;
    if (!store) return memoryStorage;
    const probe = '__yt_search_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return memoryStorage;
  }
}

export class LRUCache {
  /**
   * @param {string} namespace - Prefix for storage keys.
   * @param {number} maxAge - Max age in milliseconds (default: 1 hour).
   * @param {number} capacity - Max number of items (default: 20).
   */
  constructor(namespace = 'yt_search_', maxAge = 3600000, capacity = 20) {
    this.namespace = namespace;
    this.maxAge = maxAge;
    this.capacity = capacity;
    this._storage = resolveStorage();
    this.keys = this._loadKeys();
  }

  /**
   * Run a single storage operation under the shared failure guard.
   * A throwing backend (quota, denied access) degrades to `fallback` with a
   * warning instead of propagating into library callers.
   *
   * @private
   * @param {string} operation - Label used in the warning.
   * @template T
   * @param {function(): T} fn - Operation to attempt.
   * @param {T} [fallback] - Value returned when the operation throws.
   * @returns {T}
   */
  _guard(operation, fn, fallback) {
    try {
      return fn();
    } catch (e) {
      console.warn(`Cache ${operation} failed`, e);
      return fallback;
    }
  }

  /**
   * @private
   * @returns {string[]} List of cache keys in order of usage.
   */
  _loadKeys() {
    return this._guard(
      'load keys',
      () => {
        const keys = this._storage.getItem(`${this.namespace}keys`);
        return keys ? JSON.parse(keys) : [];
      },
      []
    );
  }

  /**
   * @private
   * @param {string[]} keys
   */
  _saveKeys(keys) {
    this._guard('save keys', () => {
      this._storage.setItem(`${this.namespace}keys`, JSON.stringify(keys));
      this.keys = keys;
    });
  }

  /**
   * Get an item from the cache.
   * @param {string} key
   * @returns {unknown} The cached value or null if not found/expired.
   */
  get(key) {
    const fullKey = `${this.namespace}${key}`;
    return this._guard(
      'get',
      () => {
        const itemStr = this._storage.getItem(fullKey);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        const now = Date.now();

        if (now - item.timestamp > this.maxAge) {
          this.remove(key);
          return null;
        }

        this._promoteKey(key);
        return item.value;
      },
      null
    );
  }

  /**
   * Move key to the end of the list to mark as recently used.
   * Recency is tracked in memory only (F-PERF-001): a read hit must not
   * rewrite the whole key index to storage. The promoted order rides along
   * on the next mutation — `set`, `remove` and `clear` all persist the
   * index — so storage stays at worst one mutation behind. A session that
   * only reads therefore never pays a write, at the price of a slightly
   * staler persisted order on reload.
   * @private
   * @param {string} key
   */
  _promoteKey(key) {
    const keyIndex = this.keys.indexOf(key);
    if (keyIndex > -1) {
      this.keys.splice(keyIndex, 1);
      this.keys.push(key);
    }
  }

  /**
   * Set an item in the cache.
   * @param {string} key
   * @param {unknown} value
   */
  set(key, value) {
    const fullKey = `${this.namespace}${key}`;
    const item = {
      value,
      timestamp: Date.now(),
    };

    this._guard('set', () => {
      // Compute the next index without mutating `this.keys` yet.
      const keys = this.keys.filter((k) => k !== key);
      keys.push(key);

      // Evict oldest entries' items while over capacity.
      const evicted = keys.splice(0, Math.max(0, keys.length - this.capacity));
      for (const oldestKey of evicted) {
        this._storage.removeItem(`${this.namespace}${oldestKey}`);
      }

      // Persist the value before the key index so a failed write never
      // leaves an index entry pointing at a missing item.
      this._storage.setItem(fullKey, JSON.stringify(item));
      this._saveKeys(keys);
    });
  }

  /**
   * Remove a specific item.
   * @param {string} key
   */
  remove(key) {
    this._guard('remove', () => {
      this._storage.removeItem(`${this.namespace}${key}`);
      this._saveKeys(this.keys.filter((k) => k !== key));
    });
  }

  /**
   * Clear all items in this namespace.
   */
  clear() {
    this._guard('clear', () => {
      this.keys.forEach((key) => {
        this._storage.removeItem(`${this.namespace}${key}`);
      });
      this._storage.removeItem(`${this.namespace}keys`);
      this.keys = [];
    });
  }
}
