#!/usr/bin/env node

/**
 * Simple CORS Proxy Server
 * Allows YouTube Search Library to make requests to YouTube's InnerTube API
 *
 * Usage: node proxy-server.js
 * Then set proxyUrl to http://localhost:3000/proxy?url= in your code
 *
 * Environment:
 *   PORT                  - listen port (default 3000)
 *   ALLOWED_ORIGINS       - comma-separated Origin allowlist; unset defaults to
 *                           local dev origins, set-but-empty denies all origins
 *   RATE_LIMIT_MAX        - requests per window per client (default 100)
 *   RATE_LIMIT_WINDOW_MS  - rate-limit window in ms (default 60000)
 */

import http from 'http';
import https from 'https';
import { fileURLToPath } from 'node:url';
import { isAllowedUrl } from './proxy-allowlist.js';
import { parseAllowedOrigins, resolveAllowedOrigin } from './proxy-cors.js';
import { RateLimiter } from './proxy-rate-limit.js';

const PORT = process.env.PORT || 3000;

/** Request bodies larger than this are rejected with 413 (F-BUG-004). */
const MAX_REQUEST_BODY_BYTES = 1024 * 1024; // 1 MB
/** Upstream responses larger than this are rejected with 502 (F-BUG-004). */
const MAX_RESPONSE_BODY_BYTES = 1024 * 1024; // 1 MB
/** Upstream requests are aborted after this (F-BUG-005). */
const UPSTREAM_TIMEOUT_MS = 15000;
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60000;
/** User-Agent sent on upstream InnerTube requests (F-CLEAN-004). */
const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

function intFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Fetches from a target URL, bounding the upstream response body and
 * enforcing an upstream timeout.
 */
function fetchUrl(targetUrl, body, config, callback) {
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    callback(Object.assign(new Error('Invalid target URL'), { statusCode: 502 }));
    return;
  }
  const protocol = parsedUrl.protocol === 'https:' ? https : http;

  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UPSTREAM_USER_AGENT,
    },
  };

  if (body && body.length) {
    options.headers['Content-Length'] = body.length;
  }

  let settled = false;
  const done = (error, response) => {
    if (settled) {
      return;
    }
    settled = true;
    callback(error, response);
  };

  const req = protocol.request(options, (res) => {
    const chunks = [];
    let received = 0;

    res.on('data', (chunk) => {
      received += chunk.length;
      if (received > config.maxResponseBodyBytes) {
        res.destroy();
        req.destroy();
        done(Object.assign(new Error('Upstream response too large'), { statusCode: 502 }));
        return;
      }
      chunks.push(chunk);
    });

    res.on('end', () => {
      done(null, {
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      });
    });

    res.on('error', (error) => {
      done(Object.assign(error, { statusCode: error.statusCode || 502 }));
    });
  });

  req.setTimeout(config.upstreamTimeoutMs, () => {
    req.destroy(Object.assign(new Error('Upstream request timed out'), { statusCode: 504 }));
  });

  req.on('error', (error) => {
    done(Object.assign(error, { statusCode: error.statusCode || 502 }));
  });

  if (body && body.length) {
    req.write(body);
  }

  req.end();
}

/**
 * Builds the CORS proxy HTTP server without listening, so tests and
 * embedders can inject limits, origins, and the allowlist predicate.
 *
 * @param {object} [options]
 * @param {number} [options.maxRequestBodyBytes]
 * @param {number} [options.maxResponseBodyBytes]
 * @param {number} [options.upstreamTimeoutMs]
 * @param {string[]} [options.allowedOrigins]
 * @param {number} [options.rateLimitMax]
 * @param {number} [options.rateLimitWindowMs]
 * @param {function(string): boolean} [options.isAllowedUrl] - Target allowlist predicate.
 * @returns {http.Server}
 */
export function createProxyServer(options = {}) {
  const config = {
    maxRequestBodyBytes: options.maxRequestBodyBytes ?? MAX_REQUEST_BODY_BYTES,
    maxResponseBodyBytes: options.maxResponseBodyBytes ?? MAX_RESPONSE_BODY_BYTES,
    upstreamTimeoutMs: options.upstreamTimeoutMs ?? UPSTREAM_TIMEOUT_MS,
    allowedOrigins: options.allowedOrigins ?? parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
    isAllowedUrl: options.isAllowedUrl ?? isAllowedUrl,
  };
  const rateLimiter = new RateLimiter({
    max: options.rateLimitMax ?? intFromEnv(process.env.RATE_LIMIT_MAX, RATE_LIMIT_MAX),
    windowMs:
      options.rateLimitWindowMs ??
      intFromEnv(process.env.RATE_LIMIT_WINDOW_MS, RATE_LIMIT_WINDOW_MS),
  });

  return http.createServer((req, res) => {
    // CORS: echo an allowlisted Origin; never a wildcard (F-SEC-001).
    const corsOrigin = resolveAllowedOrigin(req.headers.origin, config.allowedOrigins);
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Basic per-client rate limit (F-SEC-001).
    const clientKey = req.socket.remoteAddress || 'unknown';
    if (!rateLimiter.allow(clientKey)) {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(rateLimiter.retryAfterMs(clientKey) / 1000),
      });
      res.end(JSON.stringify({ error: 'Too many requests' }));
      return;
    }

    // Parse incoming request (F-BUG-011: WHATWG URL API, not the legacy parser).
    // Malformed request targets must never crash the process.
    let parsedUrl;
    try {
      parsedUrl = new URL(req.url, 'http://localhost');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Malformed request URL' }));
      return;
    }
    const pathname = parsedUrl.pathname;

    if (pathname === '/proxy' || pathname === '/proxy/' || pathname === '') {
      let targetUrl = parsedUrl.searchParams.get('url');
      if (!targetUrl) {
        try {
          targetUrl = decodeURIComponent(pathname.split('/proxy/')[1] || '');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Malformed request URL' }));
          return;
        }
      }

      if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing url parameter' }));
        return;
      }

      if (!config.isAllowedUrl(targetUrl)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL not allowed' }));
        return;
      }

      // Reject over-cap bodies up front when the client declares a length.
      const declaredLength = Number(req.headers['content-length'] || 0);
      if (declaredLength > config.maxRequestBodyBytes) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        req.resume(); // drain and discard — never buffered
        return;
      }

      // Read request body with a hard byte cap (F-BUG-004).
      const chunks = [];
      let received = 0;
      let rejected = false;
      req.on('data', (chunk) => {
        if (rejected) {
          return;
        }
        received += chunk.length;
        if (received > config.maxRequestBodyBytes) {
          rejected = true;
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request body too large' }));
          req.removeAllListeners('data');
          req.resume(); // drain and discard — never buffered
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        if (rejected) {
          return;
        }
        fetchUrl(targetUrl, Buffer.concat(chunks), config, (error, response) => {
          if (error) {
            res.writeHead(error.statusCode || 502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
            return;
          }

          res.writeHead(response.statusCode, {
            'Content-Type': 'application/json',
          });
          res.end(response.body);
        });
      });

      req.on('error', () => {
        // Client aborted mid-upload; nothing useful left to send.
        if (!res.headersSent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request failed' }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
}

// Only listen when invoked directly (`node proxy-server.js`), not on import.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = createProxyServer();
  server.listen(PORT, () => {
    /* eslint-disable no-console */
    console.log(`CORS Proxy Server running on http://localhost:${PORT}`);
    console.log(`Use proxy URL: http://localhost:${PORT}/proxy?url=`);
    console.log('');
    console.log('Example with YouTubeClient:');
    console.log(`  const client = new YouTubeClient({`);
    console.log(`    proxyUrl: 'http://localhost:${PORT}/proxy?url='`);
    console.log(`  });`);
    console.log('');
    /* eslint-enable no-console */
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    /* eslint-disable no-console */
    console.log('\nShutting down proxy server...');
    /* eslint-enable no-console */
    server.close(() => {
      process.exit(0);
    });
  });
}
