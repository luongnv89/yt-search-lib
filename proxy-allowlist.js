/**
 * Hostname allowlist for the CORS proxy.
 *
 * Extracted from proxy-server.js so the rule can be unit-tested offline.
 */

const ALLOWED_HOSTS = ['www.youtube.com', 'youtube.com', 'youtubei.googleapis.com'];

/**
 * Validates if a URL targets an allowed host.
 *
 * A hostname is allowed only on an exact match or when it is a subdomain
 * of an allowlist entry (`host.endsWith('.' + allowed)` — the dot boundary
 * is required). Substring matching is deliberately not used: it lets
 * lookalike domains such as `youtube.com.evil.tld` or `notyoutube.com`
 * through the gate.
 */
export function isAllowedUrl(targetUrl) {
  try {
    const parsedUrl = new URL(targetUrl);
    const host = parsedUrl.hostname;
    return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed));
  } catch {
    return false;
  }
}
