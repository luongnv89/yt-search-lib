# CORS Proxy Setup Guide

This guide explains how to set up and use the local CORS proxy with the YouTube Search Library.

## Why a CORS Proxy?

YouTube's InnerTube API is protected by CORS (Cross-Origin Resource Sharing) policies. When making requests from a browser or Node.js application, these requests are blocked unless they come from an allowed origin. A CORS proxy acts as a middleware to forward requests to YouTube while bypassing these restrictions.

## Quick Start

### 1. Start the Proxy Server

Open a terminal and run:

```bash
npm run proxy:start
```

Or directly:

```bash
node proxy-server.js
```

You should see output like:

```
CORS Proxy Server running on http://127.0.0.1:3000
Use proxy URL: http://127.0.0.1:3000/proxy?url=

Example with YouTubeClient:
  const client = new YouTubeClient({
    proxyUrl: 'http://127.0.0.1:3000/proxy?url='
  });
```

### 2. Use the Proxy in Your Code

```javascript
import { YouTubeClient } from 'yt-search-lib';

const client = new YouTubeClient({
  proxyUrl: 'http://127.0.0.1:3000/proxy?url='
});

// Now you can use the library normally
const results = await client.search('lofi hip hop', { limit: 5 });
console.log(results);
```

### 3. Run Integration Tests

With the proxy running, in a separate terminal:

```bash
npm run test:integration:proxy
```

## How It Works

### Request Flow

1. **Client Request**: Your application calls `client.search(query)`
2. **Proxy Endpoint**: The request is sent to `http://127.0.0.1:3000/proxy?url=ENCODED_URL`
3. **YouTube Request**: The proxy forwards the request to YouTube's InnerTube API
4. **Response**: The proxy returns YouTube's response to your application
5. **CORS Headers**: The proxy echoes the request `Origin` when it appears in the `ALLOWED_ORIGINS` allowlist (never a wildcard)

### Proxy URL Format

The proxy accepts two URL patterns:

**Query parameter format:**
```
http://127.0.0.1:3000/proxy?url=https%3A%2F%2Fyoutubei.googleapis.com%2Fyoutube%2Fv2%2Fsearch
```

**Path format:**
```
http://127.0.0.1:3000/proxy/https://youtubei.googleapis.com/youtube/v2/search
```

The library uses the query parameter format automatically.

## Features

- ✅ **CORS Support**: Echoes allowlisted request origins (never `*`) — see `ALLOWED_ORIGINS`
- ✅ **Rate Limiting**: Basic per-client request limit (`RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MS`)
- ✅ **Bounded Bodies**: 1 MB caps on request and upstream-response bodies (413/502)
- ✅ **Allowed Hosts**: Only proxies requests to YouTube-related domains (security feature)
- ✅ **User-Agent**: Includes a browser-like User-Agent header to avoid blocking
- ✅ **POST Requests**: Properly forwards JSON POST bodies
- ✅ **Error Handling**: Returns meaningful error messages
- ✅ **Lightweight**: No external dependencies, uses Node.js built-in modules

## Configuration

### Port

The default port is `3000`. To use a different port:

```bash
PORT=8080 npm run proxy:start
```

### Environment Variables

- `PORT`: The port to listen on (default: 3000)
- `ALLOWED_ORIGINS`: Comma-separated CORS origin allowlist (default: `http://localhost:3000,http://127.0.0.1:3000`)
- `RATE_LIMIT_MAX`: Requests allowed per client per window (default: 100)
- `RATE_LIMIT_WINDOW_MS`: Rate-limit window in milliseconds (default: 60000)

## Security Considerations

⚠️ **Important**: This proxy is designed for development and testing purposes.

### Limitations

- **Allowed Hosts**: The proxy only forwards requests to YouTube domains (allowlist protection)
- **Allowed Origins**: `Access-Control-Allow-Origin` is echoed only for origins in `ALLOWED_ORIGINS` — configure it for any public deployment
- **No Authentication**: The proxy doesn't authenticate requests - any application using it can make YouTube searches
- **Rate Limiting**: The proxy enforces a basic per-client limit; YouTube may also rate-limit requests from the proxy's IP
- **Data Privacy**: Requests pass through the proxy, so avoid sending sensitive data

### For Production

For production environments:

1. **Host Your Own Proxy**: Deploy the proxy-server.js on your infrastructure
2. **Set `ALLOWED_ORIGINS`**: Restrict CORS to your exact origins — the proxy never emits `Access-Control-Allow-Origin: *`
3. **Add Authentication**: Implement request authentication for sensitive deployments
4. **Use HTTPS**: Always use HTTPS in production
5. **Monitor Traffic**: Keep logs of proxy requests for security auditing

### Deployment Examples

**Docker:**
```dockerfile
FROM node:20
WORKDIR /app
COPY proxy-server.js .
EXPOSE 3000
CMD ["node", "proxy-server.js"]
```

**Environment Variable:**
```bash
# Use different ports for different environments
PORT=3000 node proxy-server.js  # Development
PORT=8080 node proxy-server.js  # Staging
```

## Troubleshooting

### Proxy not accessible

**Problem**: "Cannot connect to proxy server"

**Solutions**:
1. Verify proxy is running: `lsof -i :3000`
2. Check port isn't in use: `netstat -an | grep 3000`
3. Try a different port: `PORT=8080 npm run proxy:start`

### YouTube blocking requests

**Problem**: Search returns 0 results despite proxy running

**Reasons**:
- YouTube detecting automated requests
- IP address rate-limited
- Changing HTML structure

**Solutions**:
1. Wait a few minutes before retrying (rate limiting)
2. Use a VPN or proxy service for your IP
3. Check if YouTube changed their API structure

### CORS errors still appearing

**Problem**: Still getting CORS errors in browser console

**Causes**:
- Not using the proxy URL
- Proxy URL not configured correctly
- Proxy server not running

**Verify**:
```javascript
// ✅ Correct - includes proxy
const client = new YouTubeClient({
  proxyUrl: 'http://127.0.0.1:3000/proxy?url='
});

// ❌ Wrong - no proxy
const client = new YouTubeClient({});
```

## Advanced Usage

### Custom Proxy URL for Different Environments

```javascript
const proxyUrl = process.env.YOUTUBE_PROXY_URL || 'http://127.0.0.1:3000/proxy?url=';

const client = new YouTubeClient({
  proxyUrl: proxyUrl
});
```

### Multiple Proxy Instances

You can run multiple proxy instances on different ports:

```bash
# Terminal 1
PORT=3000 node proxy-server.js

# Terminal 2
PORT=3001 node proxy-server.js
```

Then load-balance between them in your application.

## API Reference

### Proxy Server API

**Endpoint**: `POST /proxy`

**Query Parameters**:
- `url` (required): The URL to proxy to (should be URL-encoded)

**Request Headers**:
- `Content-Type`: Should be `application/json` for JSON requests

**Response Headers**:
- `Access-Control-Allow-Origin`: the request's `Origin`, echoed only when allowlisted
- `Content-Type`: Matches the proxied response

**Example**:
```bash
curl -X POST "http://127.0.0.1:3000/proxy?url=https%3A%2F%2Fyoutubei.googleapis.com%2Fyoutube%2Fv2%2Fsearch" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","context":{"client":{...}}}'
```

## Integration Tests

Run the integration test suite to verify the proxy works correctly:

```bash
# Terminal 1: Start proxy
npm run proxy:start

# Terminal 2: Run tests
npm run test:integration:proxy
```

Expected output:
```
============================================================
YouTube Search Library - Integration Tests (with Local Proxy)
============================================================
...
Test 1: Basic video search...
  ✓ Found 3 results
...
Results: 6 passed, 0 failed
============================================================
```

## Common Issues & FAQ

**Q: Can I use this proxy in a web browser?**
A: Yes! The proxy adds CORS headers, so you can use it from browser JavaScript. Just make sure the proxy is accessible from your browser.

**Q: Can I use a public proxy instead?**
A: Yes, but public proxies may be rate-limited or unreliable. For production, host your own proxy.

**Q: Does the proxy cache responses?**
A: No, the proxy doesn't cache. Caching is handled by the YouTubeClient library. You can enable caching with `useCache: true`.

**Q: Is the proxy safe to expose to the internet?**
A: Only with `ALLOWED_ORIGINS` set to your exact origins — the proxy enforces a basic rate limit and body-size caps, but has no authentication. Prefer development use or front it with proper security layers.

## Related Files

- `proxy-server.js` - The proxy server implementation
- `integration-with-proxy.test.js` - Integration tests using the proxy
- `src/lib/transport.js` - How the library uses the proxy
