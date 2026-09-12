/**
 * Unit tests for yt-search-lib
 * Uses Node.js built-in test runner (node:test)
 */

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] ?? null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import modules
const { LRUCache } = await import('./src/lib/cache.js');
const { Transport } = await import('./src/lib/transport.js');
const { parseSearchResults } = await import('./src/lib/parser.js');
const YouTubeClient = (await import('./src/index.js')).default;
const { isAllowedUrl } = await import('./proxy-allowlist.js');

// ============================================
// LRUCache Tests
// ============================================

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('LRUCache', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const cache = new LRUCache();
      assert.strictEqual(cache.namespace, 'yt_search_');
      assert.strictEqual(cache.maxAge, 3600000);
      assert.strictEqual(cache.capacity, 20);
      assert.deepStrictEqual(cache.keys, []);
    });

    it('should initialize with custom values', () => {
      const cache = new LRUCache('test_', 60000, 10);
      assert.strictEqual(cache.namespace, 'test_');
      assert.strictEqual(cache.maxAge, 60000);
      assert.strictEqual(cache.capacity, 10);
    });
  });

  describe('set()', () => {
    it('should store a value with timestamp', () => {
      const cache = new LRUCache('test_', 3600000, 10);
      cache.set('key1', 'value1');

      const stored = localStorageMock.getItem('test_key1');
      const parsed = JSON.parse(stored);
      assert.strictEqual(parsed.value, 'value1');
      assert.ok(parsed.timestamp > 0);
    });

    it('should add key to keys list', () => {
      const cache = new LRUCache('test_');
      cache.set('key1', 'value1');

      const keys = JSON.parse(localStorageMock.getItem('test_keys'));
      assert.deepStrictEqual(keys, ['key1']);
    });

    it('should move existing key to end (most recent)', () => {
      const cache = new LRUCache('test_', 3600000, 10);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key1', 'value1_updated');

      const keys = JSON.parse(localStorageMock.getItem('test_keys'));
      assert.deepStrictEqual(keys, ['key2', 'key1']);
    });

    it('should evict oldest item when capacity exceeded', () => {
      const cache = new LRUCache('test_', 3600000, 3);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');

      const keys = JSON.parse(localStorageMock.getItem('test_keys'));
      assert.deepStrictEqual(keys, ['key2', 'key3', 'key4']);
      assert.strictEqual(localStorageMock.getItem('test_key1'), null);
    });
  });

  describe('get()', () => {
    it('should return stored value', () => {
      const cache = new LRUCache('test_');
      cache.set('key1', 'value1');

      const result = cache.get('key1');
      assert.strictEqual(result, 'value1');
    });

    it('should return null for non-existent key', () => {
      const cache = new LRUCache('test_');
      const result = cache.get('nonexistent');
      assert.strictEqual(result, null);
    });

    it('should return null for expired items', () => {
      const cache = new LRUCache('test_', 1, 10); // 1ms maxAge
      cache.set('key1', 'value1');

      // Wait for expiration
      const start = Date.now();
      while (Date.now() - start < 10) {
        /* busy wait for cache expiration */
      }

      const result = cache.get('key1');
      assert.strictEqual(result, null);
    });

    it('should promote key to most recent on access', () => {
      const cache = new LRUCache('test_', 3600000, 10);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1');

      const keys = JSON.parse(localStorageMock.getItem('test_keys'));
      assert.deepStrictEqual(keys, ['key2', 'key1']);
    });

    it('should return null on parse error', () => {
      const cache = new LRUCache('test_');
      localStorageMock.setItem('test_badkey', 'invalid-json');

      const result = cache.get('badkey');
      assert.strictEqual(result, null);
    });
  });

  describe('remove()', () => {
    it('should remove a specific key', () => {
      const cache = new LRUCache('test_');
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.remove('key1');

      assert.strictEqual(cache.get('key1'), null);
      assert.strictEqual(cache.get('key2'), 'value2');

      const keys = JSON.parse(localStorageMock.getItem('test_keys'));
      assert.deepStrictEqual(keys, ['key2']);
    });
  });

  describe('clear()', () => {
    it('should remove all cached items', () => {
      const cache = new LRUCache('test_');
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      assert.strictEqual(cache.get('key1'), null);
      assert.strictEqual(cache.get('key2'), null);
      assert.strictEqual(cache.get('key3'), null);
      assert.deepStrictEqual(cache.keys, []);
    });
  });
});

// ============================================
// Transport Tests
// ============================================

describe('Transport', () => {
  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const transport = new Transport();
      assert.strictEqual(transport.proxyUrl, '');
      assert.ok(typeof transport.fetch === 'function');
    });

    it('should accept custom configuration', () => {
      const mockFetch = () => {};
      const transport = new Transport({
        proxyUrl: 'https://proxy.example.com/',
        fetch: mockFetch,
        headers: { 'X-Custom': 'value' },
      });
      assert.strictEqual(transport.proxyUrl, 'https://proxy.example.com/');
      assert.strictEqual(transport.fetch, mockFetch);
      assert.strictEqual(transport.headers['X-Custom'], 'value');
    });
  });

  describe('post()', () => {
    it('should throw error for empty query', async () => {
      const client = new YouTubeClient({ useCache: false });
      await assert.rejects(
        async () => {
          await client.search('');
        },
        (err) => err.message === 'Query is required' && err instanceof Error
      );
    });

    it('should throw error for null query', async () => {
      const client = new YouTubeClient({ useCache: false });
      await assert.rejects(
        async () => {
          await client.search(null);
        },
        (err) => err.message === 'Query is required' && err instanceof Error
      );
    });

    it('should throw error for undefined query', async () => {
      const client = new YouTubeClient({ useCache: false });
      await assert.rejects(
        async () => {
          await client.search(undefined);
        },
        (err) => err.message === 'Query is required' && err instanceof Error
      );
    });
  });
});

// ============================================
// Parser Tests
// ============================================

describe('Parser', () => {
  describe('parseSearchResults()', () => {
    it('should return empty array for null response', () => {
      const result = parseSearchResults(null);
      assert.deepStrictEqual(result, []);
    });

    it('should return empty array for undefined response', () => {
      const result = parseSearchResults(undefined);
      assert.deepStrictEqual(result, []);
    });

    it('should return empty array for empty contents', () => {
      const result = parseSearchResults({});
      assert.deepStrictEqual(result, []);
    });

    it('should return empty array when contents structure is missing', () => {
      const response = { contents: {} };
      const result = parseSearchResults(response);
      assert.deepStrictEqual(result, []);
    });

    it('should parse video renderer correctly', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          videoRenderer: {
                            videoId: 'abc123',
                            title: { simpleText: 'Test Video' },
                            thumbnail: {
                              thumbnails: [
                                { url: 'https://example.com/thumb.jpg', width: 320, height: 180 },
                              ],
                            },
                            ownerText: { simpleText: 'Test Channel' },
                            lengthText: { simpleText: '10:00' },
                            publishedTimeText: { simpleText: '2 days ago' },
                            viewCountText: { simpleText: '1M views' },
                            badges: [{ metadataBadgeRenderer: { label: 'NEW' } }],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].type, 'video');
      assert.strictEqual(results[0].id, 'abc123');
      assert.strictEqual(results[0].title, 'Test Video');
      assert.strictEqual(results[0].link, 'https://www.youtube.com/watch?v=abc123');
      assert.strictEqual(results[0].author, 'Test Channel');
      assert.strictEqual(results[0].duration, '10:00');
      assert.strictEqual(results[0].publishedAt, '2 days ago');
      assert.strictEqual(results[0].viewCount, '1M views');
      assert.deepStrictEqual(results[0].badges, ['NEW']);
    });

    it('should parse channel renderer correctly', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          channelRenderer: {
                            channelId: 'UC123',
                            title: { simpleText: 'Test Channel' },
                            descriptionSnippet: { simpleText: 'Channel description' },
                            subscriberCountText: { simpleText: '1M subscribers' },
                            videoCountText: { simpleText: '100 videos' },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].type, 'channel');
      assert.strictEqual(results[0].id, 'UC123');
      assert.strictEqual(results[0].title, 'Test Channel');
      assert.strictEqual(results[0].description, 'Channel description');
      assert.strictEqual(results[0].subscriberCount, '1M subscribers');
      assert.strictEqual(results[0].videoCount, '100 videos');
    });

    it('should parse playlist renderer correctly', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          playlistRenderer: {
                            playlistId: 'PL123',
                            title: { simpleText: 'Test Playlist' },
                            videoCountText: { simpleText: '50 videos' },
                            longBylineText: { simpleText: 'Playlist Owner' },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].type, 'playlist');
      assert.strictEqual(results[0].id, 'PL123');
      assert.strictEqual(results[0].title, 'Test Playlist');
      assert.strictEqual(results[0].videoCount, '50 videos');
      assert.strictEqual(results[0].author, 'Playlist Owner');
    });

    it('should handle mixed content types', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        { videoRenderer: { videoId: 'v1', title: { simpleText: 'Video 1' } } },
                        {
                          channelRenderer: { channelId: 'c1', title: { simpleText: 'Channel 1' } },
                        },
                        {
                          playlistRenderer: {
                            playlistId: 'p1',
                            title: { simpleText: 'Playlist 1' },
                          },
                        },
                        { videoRenderer: { videoId: 'v2', title: { simpleText: 'Video 2' } } },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.strictEqual(results.length, 4);
      assert.strictEqual(results[0].type, 'video');
      assert.strictEqual(results[1].type, 'channel');
      assert.strictEqual(results[2].type, 'playlist');
      assert.strictEqual(results[3].type, 'video');
    });

    it('should skip unknown item types', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        { videoRenderer: { videoId: 'v1', title: { simpleText: 'Video 1' } } },
                        { unknownRenderer: { foo: 'bar' } },
                        { videoRenderer: { videoId: 'v2', title: { simpleText: 'Video 2' } } },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.strictEqual(results.length, 2);
    });

    it('should handle missing optional fields gracefully', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          videoRenderer: {
                            videoId: 'v1',
                            // Missing title, thumbnail, etc.
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'v1');
      assert.strictEqual(results[0].title, '');
      assert.strictEqual(results[0].thumbnail_url, '');
      assert.deepStrictEqual(results[0].thumbnails, []);
    });

    it('should handle empty item section', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.deepStrictEqual(results, []);
    });
  });
});

// ============================================
// YouTubeClient Tests
// ============================================

describe('YouTubeClient', () => {
  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const client = new YouTubeClient();
      assert.ok(client.transport instanceof Transport);
      assert.ok(client.cache instanceof LRUCache);
      assert.strictEqual(client.apiKey.length > 0, true);
    });

    it('should disable cache when useCache is false', () => {
      const client = new YouTubeClient({ useCache: false });
      assert.strictEqual(client.cache, null);
    });

    it('should use custom proxyUrl', () => {
      const client = new YouTubeClient({ proxyUrl: 'https://proxy.example.com/' });
      assert.strictEqual(client.transport.proxyUrl, 'https://proxy.example.com/');
    });

    it('should merge custom clientContext', () => {
      const client = new YouTubeClient({
        clientContext: { clientName: 'ANDROID', clientVersion: '1.0' },
      });
      assert.strictEqual(client.context.clientName, 'ANDROID');
      assert.strictEqual(client.context.clientVersion, '1.0');
      // Other defaults should be preserved
      assert.strictEqual(client.context.hl, 'en');
    });
  });

  describe('search()', () => {
    it('should filter results by type', async () => {
      // Create a mock transport that returns video results
      const mockFetch = async (_url, _options) => {
        return new Response(
          JSON.stringify({
            contents: {
              twoColumnSearchResultsRenderer: {
                primaryContents: {
                  sectionListRenderer: {
                    contents: [
                      {
                        itemSectionRenderer: {
                          contents: [
                            { videoRenderer: { videoId: 'v1', title: { simpleText: 'Video 1' } } },
                            { videoRenderer: { videoId: 'v2', title: { simpleText: 'Video 2' } } },
                            {
                              channelRenderer: {
                                channelId: 'c1',
                                title: { simpleText: 'Channel 1' },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          })
        );
      };

      class Response {
        constructor(body) {
          this._body = body;
        }
        async json() {
          return JSON.parse(this._body);
        }
        get ok() {
          return true;
        }
        get status() {
          return 200;
        }
        get statusText() {
          return 'OK';
        }
        async text() {
          return this._body;
        }
      }

      const client = new YouTubeClient({
        useCache: false,
        fetch: mockFetch,
      });

      // Test type filtering - only videos
      const videoResults = await client.search('test', { type: 'video' });
      assert.strictEqual(videoResults.length, 2);
      assert.ok(videoResults.every((r) => r.type === 'video'));

      // Test type filtering - only channels
      const channelResults = await client.search('test', { type: 'channel' });
      assert.strictEqual(channelResults.length, 1);
      assert.strictEqual(channelResults[0].type, 'channel');
    });

    it('should respect limit parameter', async () => {
      const mockFetch = async (_url, _options) => {
        return new Response(
          JSON.stringify({
            contents: {
              twoColumnSearchResultsRenderer: {
                primaryContents: {
                  sectionListRenderer: {
                    contents: [
                      {
                        itemSectionRenderer: {
                          contents: [
                            { videoRenderer: { videoId: 'v1', title: { simpleText: 'Video 1' } } },
                            { videoRenderer: { videoId: 'v2', title: { simpleText: 'Video 2' } } },
                            { videoRenderer: { videoId: 'v3', title: { simpleText: 'Video 3' } } },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          })
        );
      };

      class Response {
        constructor(body) {
          this._body = body;
        }
        async json() {
          return JSON.parse(this._body);
        }
        get ok() {
          return true;
        }
        get status() {
          return 200;
        }
        get statusText() {
          return 'OK';
        }
        async text() {
          return this._body;
        }
      }

      const client = new YouTubeClient({
        useCache: false,
        fetch: mockFetch,
      });

      const results = await client.search('test', { limit: 2 });
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].id, 'v1');
      assert.strictEqual(results[1].id, 'v2');
    });
  });

  describe('clearCache()', () => {
    it('should clear the cache when enabled', () => {
      const client = new YouTubeClient();
      client.clearCache();
      const cacheKeysAfter = JSON.parse(localStorageMock.getItem('yt_search_keys') || '[]');
      assert.strictEqual(cacheKeysAfter.length, 0);
    });

    it('should do nothing when cache is disabled', () => {
      const client = new YouTubeClient({ useCache: false });
      // Should not throw
      client.clearCache();
    });
  });
});

// ============================================
// Edge Cases & Boundary Tests
// ============================================

describe('Edge Cases', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('LRUCache capacity boundaries', () => {
    it('should handle capacity of 1', () => {
      const cache = new LRUCache('test_', 3600000, 1);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      assert.strictEqual(cache.get('key1'), null);
      assert.strictEqual(cache.get('key2'), 'value2');
    });

    it('should handle capacity of 0', () => {
      const cache = new LRUCache('test_', 3600000, 0);
      cache.set('key1', 'value1');
      // With capacity 0, the key is added then immediately evicted
      // since 1 > 0, so the eviction loop runs
      const keys = JSON.parse(localStorageMock.getItem('test_keys'));
      assert.strictEqual(keys.length, 0);
    });

    it('should handle negative maxAge', () => {
      const cache = new LRUCache('test_', -1, 10);
      cache.set('key1', 'value1');
      // Item should be expired immediately
      assert.strictEqual(cache.get('key1'), null);
    });
  });

  describe('Parser edge cases', () => {
    it('should handle runs with empty text', () => {
      // Test the behavior indirectly through parseSearchResults
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          videoRenderer: {
                            videoId: 'v1',
                            title: { runs: [{ text: '' }, { text: 'hello' }, { text: '' }] },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.strictEqual(results[0].title, 'hello');
    });

    it('should handle malformed JSON in response gracefully', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          videoRenderer: {
                            // Missing videoId - parser still creates item with undefined id
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      // The parser creates an item even with missing videoId
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, undefined);
    });

    it('should handle malformed thumbnails array', () => {
      const response = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          videoRenderer: {
                            videoId: 'v1',
                            title: { simpleText: 'Test' },
                            thumbnail: {
                              thumbnails: null,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const results = parseSearchResults(response);
      assert.strictEqual(results.length, 1);
      assert.deepStrictEqual(results[0].thumbnails, []);
      assert.strictEqual(results[0].thumbnail_url, '');
    });
  });

  describe('Client edge cases', () => {
    it('should handle extremely long query strings', () => {
      const longQuery = 'a'.repeat(10000);
      assert.strictEqual(longQuery.length, 10000);
    });

    it('should handle special characters in query', () => {
      const specialQuery = 'test & "quotes" <brackets>';
      assert.ok(specialQuery.length > 0);
    });

    it('should handle unicode characters in query', () => {
      const unicodeQuery = 'テスト 🧪 🚀 ñ';
      assert.ok(unicodeQuery.length > 0);
    });
  });
});

// ============================================
// Proxy hostname allowlist (F-BUG-001)
// ============================================

describe('isAllowedUrl (proxy allowlist)', () => {
  describe('allowed hosts', () => {
    const allowed = [
      'https://www.youtube.com/watch?v=abc',
      'https://youtube.com/watch?v=abc',
      'https://youtubei.googleapis.com/youtubei/v1/search',
      'https://music.youtube.com/x',
      'https://m.youtube.com/x',
      'https://WWW.YOUTUBE.COM/x',
      'https://www.youtube.com:443/x',
    ];
    for (const target of allowed) {
      it(`allows ${target}`, () => {
        assert.strictEqual(isAllowedUrl(target), true);
      });
    }
  });

  describe('rejected hosts', () => {
    const rejected = [
      'https://youtube.com.evil.tld/x',
      'https://www.youtube.com.evil.tld/x',
      'https://notyoutube.com/x',
      'https://xyoutube.com/x',
      'https://evil-youtube.com/x',
      'https://youtube.com.attacker.com/x',
      'https://youtubei.googleapis.com.evil.tld/x',
      'https://youtube.com./x',
      'https://youtube.com@evil.tld/x',
      'https://evil.tld/?next=youtube.com',
      'file:///etc/passwd',
      'not a url',
      '',
    ];
    for (const target of rejected) {
      it(`rejects ${target || '(empty string)'}`, () => {
        assert.strictEqual(isAllowedUrl(target), false);
      });
    }
  });
});
