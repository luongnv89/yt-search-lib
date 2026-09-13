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

// The shared suite loads only after the gate: it pulls in the library and
// installs the localStorage mock.
const { runIntegrationSuite } = await import('./integration-lib.js');

runIntegrationSuite({
  proxyUrl: 'https://api.allorigins.win/raw?url=',
  title: 'YouTube Search Library - Integration Tests',
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
