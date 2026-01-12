/**
 * Simple LRU (Least Recently Used) Cache using localStorage.
 * 
 * @module cache
 */

export class LRUCache {
  /**
   * @param {string} namespace - Prefix for localStorage keys.
   * @param {number} maxAge - Max age in milliseconds (default: 1 hour).
   * @param {number} capacity - Max number of items (default: 20).
   */
  constructor(namespace = 'yt_search_', maxAge = 3600000, capacity = 20) {
    this.namespace = namespace;
    this.maxAge = maxAge;
    this.capacity = capacity;
    this.keys = this._loadKeys();
  }

  /**
   * @private
   * @returns {string[]} List of cache keys in order of usage.
   */
  _loadKeys() {
    try {
      const keys = localStorage.getItem(`${this.namespace}keys`);
      return keys ? JSON.parse(keys) : [];
    } catch (e) {
      console.warn('Failed to load cache keys', e);
      return [];
    }
  }

  /**
   * @private
   * @param {string[]} keys 
   */
  _saveKeys(keys) {
    try {
      localStorage.setItem(`${this.namespace}keys`, JSON.stringify(keys));
      this.keys = keys;
    } catch (e) {
      console.warn('Failed to save cache keys', e);
    }
  }

  /**
   * Get an item from the cache.
   * @param {string} key 
   * @returns {any|null} The cached value or null if not found/expired.
   */
  get(key) {
    const fullKey = `${this.namespace}${key}`;
    try {
      const itemStr = localStorage.getItem(fullKey);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      const now = Date.now();

      if (now - item.timestamp > this.maxAge) {
        this.remove(key);
        return null;
      }

      this._promoteKey(key);
      return item.value;
    } catch (e) {
      console.warn('Cache get failed', e);
      return null;
    }
  }

  /**
   * Move key to the end of the list to mark as recently used.
   * @private
   * @param {string} key
   */
  _promoteKey(key) {
    const keyIndex = this.keys.indexOf(key);
    if (keyIndex > -1) {
      this.keys.splice(keyIndex, 1);
      this.keys.push(key);
      this._saveKeys(this.keys);
    }
  }

  /**
   * Set an item in the cache.
   * @param {string} key 
   * @param {any} value 
   */
  set(key, value) {
    const fullKey = `${this.namespace}${key}`;
    const item = {
      value,
      timestamp: Date.now()
    };

    try {
      const keyIndex = this.keys.indexOf(key);
      if (keyIndex > -1) {
        this.keys.splice(keyIndex, 1);
      }
      this.keys.push(key);

      while (this.keys.length > this.capacity) {
        const oldestKey = this.keys.shift();
        localStorage.removeItem(`${this.namespace}${oldestKey}`);
      }

      this._saveKeys(this.keys);
      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (e) {
      console.warn('Cache set failed', e);
    }
  }

  /**
   * Remove a specific item.
   * @param {string} key 
   */
  remove(key) {
    try {
      localStorage.removeItem(`${this.namespace}${key}`);
      const newKeys = this.keys.filter(k => k !== key);
      this._saveKeys(newKeys);
    } catch (e) {
      console.warn('Cache remove failed', e);
    }
  }

  /**
   * Clear all items in this namespace.
   */
  clear() {
    try {
      this.keys.forEach(key => {
        localStorage.removeItem(`${this.namespace}${key}`);
      });
      localStorage.removeItem(`${this.namespace}keys`);
      this.keys = [];
    } catch (e) {
      console.warn('Cache clear failed', e);
    }
  }
}
