#!/usr/bin/env node

/**
 * Simple CORS Proxy Server
 * Allows YouTube Search Library to make requests to YouTube's InnerTube API
 *
 * Usage: node proxy-server.js
 * Then set proxyUrl to http://localhost:3000/proxy?url= in your code
 */

import http from 'http';
import https from 'https';
import url from 'url';
import { isAllowedUrl } from './proxy-allowlist.js';

const PORT = process.env.PORT || 3000;

/**
 * Fetches from a target URL
 */
function fetchUrl(targetUrl, body, callback) {
  const protocol = targetUrl.startsWith('https') ? https : http;
  const parsedUrl = new URL(targetUrl);

  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  };

  if (body) {
    options.headers['Content-Length'] = Buffer.byteLength(body);
  }

  const req = protocol.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      callback(null, {
        statusCode: res.statusCode,
        headers: res.headers,
        body: data,
      });
    });
  });

  req.on('error', (error) => {
    callback(error);
  });

  if (body) {
    req.write(body);
  }

  req.end();
}

/**
 * Create HTTP server
 */
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse incoming request
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Handle proxy endpoint
  if (pathname === '/proxy' || pathname === '/proxy/' || pathname === '') {
    const targetUrl = query.url || decodeURIComponent(pathname.split('/proxy/')[1] || '');

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return;
    }

    if (!isAllowedUrl(targetUrl)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL not allowed' }));
      return;
    }

    // Read request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      fetchUrl(targetUrl, body, (error, response) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
          return;
        }

        res.writeHead(response.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(response.body);
      });
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

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
