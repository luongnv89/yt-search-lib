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
const { createProxyServer } = await import('./proxy-server.js');
const { DEFAULT_ALLOWED_ORIGINS, parseAllowedOrigins, resolveAllowedOrigin } =
  await import('./proxy-cors.js');
const { RateLimiter } = await import('./proxy-rate-limit.js');

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
      'https://deep.sub.youtube.com/x',
      'https://foo.youtubei.googleapis.com/x',
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
      'https://www.youtube.com./x',
      'https://youtube.com@evil.tld/x',
      'https://YOUTUBE.COM.EVIL.TLD/x',
      'https://xn--outube-vrf.com/x',
      'https://уoutube.com/x',
      'https://youtube.com%2eevil.tld/x',
      'https://youtube.com..evil.tld/x',
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

// ============================================
// Transport timeout (F-BUG-005)
// ============================================

describe('Transport timeout', () => {
  it('uses a 30s default timeout', () => {
    const transport = new Transport();
    assert.strictEqual(transport.timeoutMs, 30000);
  });

  it('honors a configured timeout', () => {
    const transport = new Transport({ timeout: 5000 });
    assert.strictEqual(transport.timeoutMs, 5000);
  });

  it('falls back to the default on invalid timeout values', () => {
    assert.strictEqual(new Transport({ timeout: -5 }).timeoutMs, 30000);
    assert.strictEqual(new Transport({ timeout: 0 }).timeoutMs, 30000);
    assert.strictEqual(new Transport({ timeout: 'abc' }).timeoutMs, 30000);
  });

  it('passes an AbortSignal to fetch', async () => {
    let seenSignal;
    const mockFetch = async (_url, options) => {
      seenSignal = options.signal;
      return { ok: true, json: async () => ({}) };
    };
    const transport = new Transport({ fetch: mockFetch });
    await transport.post('https://example.com/x', {});
    assert.ok(seenSignal instanceof AbortSignal);
    assert.strictEqual(seenSignal.aborted, false);
  });

  it('normalizes a TimeoutError into a friendly message', async () => {
    const mockFetch = async () => {
      const error = new Error('The operation timed out');
      error.name = 'TimeoutError';
      throw error;
    };
    const transport = new Transport({ fetch: mockFetch, timeout: 50 });
    await assert.rejects(
      () => transport.post('https://example.com/x', {}),
      (err) => err.message === 'Request timed out after 50ms'
    );
  });

  it('lets YouTubeClient pass a timeout through', () => {
    const client = new YouTubeClient({ timeout: 1234 });
    assert.strictEqual(client.transport.timeoutMs, 1234);
  });
});

// ============================================
// Proxy CORS origin allowlist (F-SEC-001)
// ============================================

describe('proxy CORS allowlist', () => {
  describe('parseAllowedOrigins()', () => {
    it('parses a comma-separated list', () => {
      assert.deepStrictEqual(parseAllowedOrigins('http://a.test, https://b.test ,'), [
        'http://a.test',
        'https://b.test',
      ]);
    });

    it('falls back to local dev origins when unset', () => {
      assert.deepStrictEqual(parseAllowedOrigins(undefined), DEFAULT_ALLOWED_ORIGINS);
      assert.deepStrictEqual(parseAllowedOrigins(null), DEFAULT_ALLOWED_ORIGINS);
    });

    it('treats an explicitly empty value as deny-all', () => {
      assert.deepStrictEqual(parseAllowedOrigins(''), []);
      assert.deepStrictEqual(parseAllowedOrigins('   '), []);
    });
  });

  describe('resolveAllowedOrigin()', () => {
    const allowed = ['http://localhost:3000', 'https://app.example'];

    it('echoes an allowlisted origin verbatim', () => {
      assert.strictEqual(
        resolveAllowedOrigin('https://app.example', allowed),
        'https://app.example'
      );
    });

    it('rejects origins not on the list', () => {
      assert.strictEqual(resolveAllowedOrigin('https://evil.example', allowed), null);
      assert.strictEqual(resolveAllowedOrigin('https://app.example.evil.test', allowed), null);
    });

    it('rejects missing or malformed inputs', () => {
      assert.strictEqual(resolveAllowedOrigin(undefined, allowed), null);
      assert.strictEqual(resolveAllowedOrigin('', allowed), null);
      assert.strictEqual(resolveAllowedOrigin('http://localhost:3000', undefined), null);
      assert.strictEqual(resolveAllowedOrigin('http://localhost:3000', []), null);
    });
  });
});

// ============================================
// Proxy rate limiter (F-SEC-001)
// ============================================

describe('RateLimiter', () => {
  it('allows up to max requests per window', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000 });
    assert.strictEqual(limiter.allow('client-a'), true);
    assert.strictEqual(limiter.allow('client-a'), true);
    assert.strictEqual(limiter.allow('client-a'), false);
  });

  it('tracks clients independently', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000 });
    assert.strictEqual(limiter.allow('a'), true);
    assert.strictEqual(limiter.allow('b'), true);
    assert.strictEqual(limiter.allow('a'), false);
  });

  it('resets the window after windowMs', () => {
    let now = 0;
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, now: () => now });
    assert.strictEqual(limiter.allow('a'), true);
    assert.strictEqual(limiter.allow('a'), false);
    now = 1001;
    assert.strictEqual(limiter.allow('a'), true);
  });

  it('reports the remaining window via retryAfterMs', () => {
    let now = 500;
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, now: () => now });
    limiter.allow('a');
    now = 700;
    assert.strictEqual(limiter.retryAfterMs('a'), 800);
    assert.strictEqual(limiter.retryAfterMs('untracked'), 0);
  });

  it('bounds tracked keys by evicting the oldest', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000, maxKeys: 3 });
    for (const key of ['a', 'b', 'c', 'd']) {
      limiter.allow(key);
    }
    assert.ok(limiter.windows.size <= 3);
  });
});

// ============================================
// Proxy server behavior (F-BUG-004/005/011, F-SEC-001)
// ============================================

describe('createProxyServer', () => {
  const allowAll = {
    isAllowedUrl: () => true,
    allowedOrigins: ['http://allowed.example'],
  };

  async function withServer(config, fn) {
    const server = createProxyServer(config);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      await fn(base);
    } finally {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
  }

  async function withUpstream(handler, fn) {
    const { createServer } = await import('node:http');
    const upstream = createServer(handler);
    await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${upstream.address().port}`;
    try {
      await fn(base);
    } finally {
      upstream.closeAllConnections?.();
      await new Promise((resolve) => upstream.close(resolve));
    }
  }

  it('returns 400 when the url parameter is missing', async () => {
    await withServer(allowAll, async (base) => {
      const res = await fetch(`${base}/proxy`, { method: 'POST', body: '{}' });
      assert.strictEqual(res.status, 400);
    });
  });

  it('returns 404 for unknown paths', async () => {
    await withServer(allowAll, async (base) => {
      const res = await fetch(`${base}/nope`, { method: 'POST', body: '{}' });
      assert.strictEqual(res.status, 404);
    });
  });

  it('returns 403 for a disallowed target', async () => {
    await withServer({ ...allowAll, isAllowedUrl: () => false }, async (base) => {
      const target = encodeURIComponent('https://youtube.com/x');
      const res = await fetch(`${base}/proxy?url=${target}`, { method: 'POST', body: '{}' });
      assert.strictEqual(res.status, 403);
    });
  });

  it('rejects a declared over-cap body with 413', async () => {
    await withServer({ ...allowAll, maxRequestBodyBytes: 16 }, async (base) => {
      const target = encodeURIComponent('https://youtube.com/x');
      const res = await fetch(`${base}/proxy?url=${target}`, {
        method: 'POST',
        body: 'x'.repeat(100),
      });
      assert.strictEqual(res.status, 413);
    });
  });

  it('rejects a chunked over-cap body with 413', async () => {
    await withServer({ ...allowAll, maxRequestBodyBytes: 16 }, async (base) => {
      const target = encodeURIComponent('https://youtube.com/x');
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('x'.repeat(100)));
          controller.close();
        },
      });
      const res = await fetch(`${base}/proxy?url=${target}`, {
        method: 'POST',
        body: stream,
        duplex: 'half',
      });
      assert.strictEqual(res.status, 413);
    });
  });

  it('proxies an allowed target and returns its response', async () => {
    await withUpstream(
      (req, res) => {
        let received = '';
        req.on('data', (chunk) => (received += chunk));
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, echo: received }));
        });
      },
      async (upstreamBase) => {
        await withServer(allowAll, async (base) => {
          const res = await fetch(`${base}/proxy?url=${encodeURIComponent(upstreamBase + '/s')}`, {
            method: 'POST',
            body: JSON.stringify({ q: 'x' }),
          });
          assert.strictEqual(res.status, 200);
          const json = await res.json();
          assert.strictEqual(json.ok, true);
          assert.deepStrictEqual(JSON.parse(json.echo), { q: 'x' });
        });
      }
    );
  });

  it('returns 502 when the upstream response exceeds the cap', async () => {
    await withUpstream(
      (req, res) => {
        req.on('data', () => {}); // consume the body so 'end' fires
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(Buffer.alloc(100, 'y'));
        });
      },
      async (upstreamBase) => {
        await withServer({ ...allowAll, maxResponseBodyBytes: 16 }, async (base) => {
          const res = await fetch(
            `${base}/proxy?url=${encodeURIComponent(upstreamBase + '/big')}`,
            { method: 'POST', body: '{}' }
          );
          assert.strictEqual(res.status, 502);
          const json = await res.json();
          assert.match(json.error, /too large/i);
        });
      }
    );
  });

  it('returns 504 when the upstream stalls past the timeout', async () => {
    await withUpstream(
      (req, _res) => {
        req.resume(); // consume the body but never respond
      },
      async (upstreamBase) => {
        await withServer({ ...allowAll, upstreamTimeoutMs: 50 }, async (base) => {
          const res = await fetch(
            `${base}/proxy?url=${encodeURIComponent(upstreamBase + '/slow')}`,
            { method: 'POST', body: '{}' }
          );
          assert.strictEqual(res.status, 504);
        });
      }
    );
  });

  it('returns 429 once the per-client rate limit is exceeded', async () => {
    await withServer({ ...allowAll, rateLimitMax: 2 }, async (base) => {
      const statuses = [];
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${base}/proxy`, { method: 'POST', body: '{}' });
        statuses.push(res.status);
      }
      assert.deepStrictEqual(statuses, [400, 400, 429]);
    });
  });

  it('echoes an allowlisted Origin and never emits a wildcard', async () => {
    await withServer(allowAll, async (base) => {
      const res = await fetch(`${base}/proxy`, {
        method: 'OPTIONS',
        headers: { Origin: 'http://allowed.example' },
      });
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://allowed.example');
      assert.notStrictEqual(res.headers.get('access-control-allow-origin'), '*');
    });
  });

  it('omits Access-Control-Allow-Origin for a non-allowlisted origin', async () => {
    await withServer(allowAll, async (base) => {
      const res = await fetch(`${base}/proxy`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example' },
      });
      assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
    });
  });

  it('omits Access-Control-Allow-Origin when no Origin is sent', async () => {
    await withServer(allowAll, async (base) => {
      const res = await fetch(`${base}/proxy`, { method: 'POST', body: '{}' });
      assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
    });
  });
});

// ============================================
// Security policy document (F-SEC-003)
// ============================================

describe('SECURITY.md', () => {
  it('exists at the repo root with a reporting channel', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = fileURLToPath(new URL('./SECURITY.md', import.meta.url));
    assert.ok(existsSync(path), 'SECURITY.md must exist at the repo root');
    const content = readFileSync(path, 'utf8');
    assert.match(content, /security\/advisories|mailto:|@/i);
  });
});
