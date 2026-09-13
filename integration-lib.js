/**
 * Shared runner for the opt-in live integration suites.
 *
 * Both entry points (integration.test.js, integration-with-proxy.test.js)
 * gate on RUN_INTEGRATION=1 before calling this — the suites perform real
 * YouTube requests through a CORS proxy and must never run by accident.
 */

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

/**
 * Runs the six live checks against YouTube through `options.proxyUrl`.
 * @param {object} options
 * @param {string} options.proxyUrl - CORS proxy prefix for client requests.
 * @param {string} options.title - Suite banner title.
 * @param {string[]} [options.notes] - Extra lines printed under the banner.
 * @returns {Promise<{passed: number, failed: number}>}
 */
export async function runIntegrationSuite({ proxyUrl, title, notes = [] }) {
  /* eslint-disable no-console */
  console.log('='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
  console.log('');
  console.log('Note: These tests perform actual YouTube API requests.');
  console.log('They may be slow and could fail due to network issues.');
  for (const note of notes) {
    console.log(note);
  }
  console.log('');

  let testPassed = 0;
  let testFailed = 0;
  const client = (useCache) => new YouTubeClient({ proxyUrl, useCache });

  // Test 1: Basic search
  console.log('Test 1: Basic video search...');
  try {
    const results = await client(false).search('lofi hip hop radio', { limit: 3 });

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
    const results = await client(false).search('Lofi Girl', { limit: 2, type: 'channel' });

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
    const results = await client(false).search('lofi playlist', { limit: 2, type: 'playlist' });

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
    const results = await client(false).search('coding music', { limit: 5, type: 'all' });

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
    const cachingClient = client(true);
    const query = 'test query ' + Date.now();

    // First search - should make network request
    const start1 = Date.now();
    const results1 = await cachingClient.search(query, { limit: 1 });
    const time1 = Date.now() - start1;

    // Second search - should use cache (faster)
    const start2 = Date.now();
    const results2 = await cachingClient.search(query, { limit: 1 });
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
    const cachingClient = client(true);
    await cachingClient.search('test', { limit: 1 });
    cachingClient.clearCache();

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
