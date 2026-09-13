#!/usr/bin/env node

/**
 * Integration tests for yt-search-lib with local CORS proxy
 *
 * These tests make real network requests to YouTube through the local proxy
 * and are explicitly opt-in: they exit early unless RUN_INTEGRATION=1 is set.
 *
 * Usage:
 * 1. Start the proxy server: npm run proxy:start
 * 2. In another terminal: RUN_INTEGRATION=1 npm run test:integration:proxy
 */

// Opt-in gate: live network tests never run by accident (not under npm test,
// not on a bare `node integration-with-proxy.test.js`). CI runs them only
// from the opt-in integration job (workflow_dispatch / weekly schedule).
if (process.env.RUN_INTEGRATION !== '1') {
  /* eslint-disable no-console */
  console.log('Skipping live integration tests — set RUN_INTEGRATION=1 to run them.');
  /* eslint-enable no-console */
  process.exit(0);
}

// The shared suite loads only after the gate: it pulls in the library and
// installs the localStorage mock.
const { runIntegrationSuite } = await import('./integration-lib.js');

runIntegrationSuite({
  proxyUrl: 'http://127.0.0.1:3000/proxy?url=',
  title: 'YouTube Search Library - Integration Tests (with Local Proxy)',
  notes: ['Using the local CORS proxy — make sure it is running:', '  node proxy-server.js'],
})
  .then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    /* eslint-disable no-console */
    console.error('Test runner failed:', error);
    /* eslint-enable no-console */
    process.exit(1);
  });
