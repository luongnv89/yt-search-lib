/**
 * CORS origin allowlist for the CORS proxy.
 *
 * Extracted from proxy-server.js so the rule can be unit-tested offline.
 * The proxy never emits a wildcard `Access-Control-Allow-Origin: *`:
 * a request Origin is echoed back only when it appears verbatim in the
 * configured allowlist.
 */

/**
 * Origins allowed when ALLOWED_ORIGINS is not configured — local
 * development only. Deployments must set ALLOWED_ORIGINS explicitly.
 */
export const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

/**
 * Parses the ALLOWED_ORIGINS environment value into a list.
 *
 * @param {string|undefined} value - Comma-separated origins, or undefined.
 * @param {string[]} [fallback] - Used when `value` is undefined/null.
 * @returns {string[]} Trimmed origin list; an explicitly empty value yields [].
 */
export function parseAllowedOrigins(value, fallback = DEFAULT_ALLOWED_ORIGINS) {
  if (value === undefined || value === null) {
    return [...fallback];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Resolves the `Access-Control-Allow-Origin` response value for a request.
 *
 * Origin strings are compared verbatim — per the CORS spec an origin is a
 * scheme/host/port triple, so suffix or substring matching would let
 * lookalike origins through.
 *
 * @param {string|undefined} requestOrigin - The request's Origin header.
 * @param {string[]} allowedOrigins - Configured allowlist.
 * @returns {string|null} The origin to echo, or null to omit the header.
 */
export function resolveAllowedOrigin(requestOrigin, allowedOrigins) {
  if (!requestOrigin || !Array.isArray(allowedOrigins)) {
    return null;
  }
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
}
