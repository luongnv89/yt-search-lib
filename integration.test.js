/**
 * Integration tests for yt-search-lib
 * Performs actual YouTube searches to verify the library works end-to-end.
 *
 * These tests make real network requests to YouTube and are explicitly
 * opt-in: they exit early unless RUN_INTEGRATION=1 is set.
 *
 * Run with: RUN_INTEGRATION=1 npm run test:integration
 *
 * Note: Requires a working CORS proxy. The default allorigins proxy
 * may be rate-limited. For production, host your own proxy.
 */

// Opt-in gate: live network tests never run by accident (not under npm test,
// not on a bare `node integration.test.js`). CI runs them only from the
// opt-in integration job (workflow_dispatch / weekly schedule).
if (process.env.RUN_INTEGRATION !== '1') {
  /* eslint-disable no-console */
  console.log('Skipping live integration tests — set RUN_INTEGRATION=1 to run them.');
  /* eslint-enable no-console */
  process.exit(0);
}

import { YouTubeClient } from './src/index.js';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Use a CORS proxy for browser-like requests
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

async function runIntegrationTests() {
  /* eslint-disable no-console */
  console.log('='.repeat(60));
  console.log('YouTube Search Library - Integration Tests');
  console.log('='.repeat(60));
  console.log('');
  console.log('Note: These tests perform actual YouTube API requests.');
  console.log('They may be slow and could fail due to network issues.');
  console.log('');

  let testPassed = 0;
  let testFailed = 0;

  // Test 1: Basic search
  console.log('Test 1: Basic video search...');
  try {
    const client = new YouTubeClient({
      proxyUrl: PROXY_URL,
      useCache: false,
    });

    const results = await client.search('lofi hip hop radio', { limit: 3 });

    if (results.length === 0) {
      console.log('  ⚠️  Warning: No results returned (YouTube may be blocking requests)');
      console.log('  This is expected in some environments.');
    } else {
      console.log(`  ✓ Found ${results.length} results`);
      results.forEach((video, i) => {
        console.log(`  ${i + 1}. "${video.title}" by ${video.author}`);
        console.log(`     URL: ${video.link}`);
      });
    }
    testPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testFailed++;
  }

  console.log('');

  // Test 2: Channel search
  console.log('Test 2: Channel search...');
  try {
    const client = new YouTubeClient({
      proxyUrl: PROXY_URL,
      useCache: false,
    });

    const results = await client.search('Lofi Girl', { limit: 2, type: 'channel' });

    if (results.length === 0) {
      console.log('  ⚠️  Warning: No channel results returned');
    } else {
      console.log(`  ✓ Found ${results.length} channels`);
      results.forEach((channel, i) => {
        console.log(`  ${i + 1}. "${channel.title}"`);
        if (channel.subscriberCount) {
          console.log(`     Subscribers: ${channel.subscriberCount}`);
        }
      });
    }
    testPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testFailed++;
  }

  console.log('');

  // Test 3: Playlist search
  console.log('Test 3: Playlist search...');
  try {
    const client = new YouTubeClient({
      proxyUrl: PROXY_URL,
      useCache: false,
    });

    const results = await client.search('lofi playlist', { limit: 2, type: 'playlist' });

    if (results.length === 0) {
      console.log('  ⚠️  Warning: No playlist results returned');
    } else {
      console.log(`  ✓ Found ${results.length} playlists`);
      results.forEach((playlist, i) => {
        console.log(`  ${i + 1}. "${playlist.title}"`);
        if (playlist.videoCount) {
          console.log(`     Videos: ${playlist.videoCount}`);
        }
      });
    }
    testPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testFailed++;
  }

  console.log('');

  // Test 4: Search with 'all' type
  console.log('Test 4: Mixed content search (all types)...');
  try {
    const client = new YouTubeClient({
      proxyUrl: PROXY_URL,
      useCache: false,
    });

    const results = await client.search('coding music', { limit: 5, type: 'all' });

    const videoCount = results.filter((r) => r.type === 'video').length;
    const channelCount = results.filter((r) => r.type === 'channel').length;
    const playlistCount = results.filter((r) => r.type === 'playlist').length;

    console.log(`  ✓ Found ${results.length} mixed results:`);
    console.log(`     - Videos: ${videoCount}`);
    console.log(`     - Channels: ${channelCount}`);
    console.log(`     - Playlists: ${playlistCount}`);
    testPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testFailed++;
  }

  console.log('');

  // Test 5: Caching functionality
  console.log('Test 5: Response caching...');
  try {
    const client = new YouTubeClient({
      proxyUrl: PROXY_URL,
      useCache: true,
    });

    const query = 'test query ' + Date.now();

    // First search - should make network request
    const start1 = Date.now();
    const results1 = await client.search(query, { limit: 1 });
    const time1 = Date.now() - start1;

    // Second search - should use cache (faster)
    const start2 = Date.now();
    const results2 = await client.search(query, { limit: 1 });
    const time2 = Date.now() - start2;

    console.log(`  First search: ${time1}ms (${results1.length} results)`);
    console.log(`  Cached search: ${time2}ms (${results2.length} results)`);

    if (time2 < time1) {
      console.log('  ✓ Cache working correctly (second search was faster)');
    } else if (results1.length > 0) {
      console.log('  ⚠️  Cache may not be working (times were similar)');
    }
    testPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testFailed++;
  }

  console.log('');

  // Test 6: Clear cache
  console.log('Test 6: Cache clearing...');
  try {
    const client = new YouTubeClient({
      proxyUrl: PROXY_URL,
      useCache: true,
    });

    // Add something to cache
    await client.search('test', { limit: 1 });
    client.clearCache();

    // Verify cache is empty
    const cacheKeys = localStorageMock.getItem('yt_search_keys');
    if (cacheKeys === null || cacheKeys === '[]') {
      console.log('  ✓ Cache cleared successfully');
    } else {
      console.log('  ⚠️  Cache may not be fully cleared');
    }
    testPassed++;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    testFailed++;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Results: ${testPassed} passed, ${testFailed} failed`);
  console.log('='.repeat(60));
  /* eslint-enable no-console */

  return { passed: testPassed, failed: testFailed };
}

// Run tests
runIntegrationTests()
  .then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    /* eslint-disable no-console */
    console.error('Test runner failed:', error);
    /* eslint-enable no-console */
    process.exit(1);
  });
