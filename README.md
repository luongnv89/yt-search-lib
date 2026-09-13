<p align="center"><img src="logo.png" alt="yt-search-lib Logo" width="400"></p>

# YouTube Search Library

A powerful, purely client-side JavaScript library for searching YouTube videos without an official API key. Built with modern JavaScript, zero dependencies, and comprehensive caching.

## ✨ Key Features

- **No API Key Required** - Works with YouTube's InnerTube API
- **100% Client-Side** - No server code needed (with configurable CORS proxies)
- **Smart Caching** - LRU cache with `localStorage` persistence in browsers, in-memory fallback in Node.js
- **TypeScript Support** - Full type definitions included
- **Zero Dependencies** - Pure JavaScript, no bloat
- **Works Everywhere** - Browser and Node.js compatible, shipping both ESM (`import`) and CommonJS (`require`) builds

## 🚀 Quick Start

```bash
npm install yt-search-lib
```

```javascript
import { YouTubeClient } from 'yt-search-lib';

const client = new YouTubeClient({
  proxyUrl: 'http://127.0.0.1:3000/proxy?url=' // or use Render, etc.
});

const results = await client.search('lofi hip hop', { limit: 5 });
results.forEach(video => console.log(video.title));
```

CommonJS works too: `const { YouTubeClient } = require('yt-search-lib');`

## 📚 Documentation

**Complete documentation is in the [`/docs`](./docs/README.md) directory.**

### Quick Links

- **[Getting Started Guide](./docs/deployment/render-quick-start.md)** - Setup in 5 minutes
- **[API Reference](./docs/API.md)** - Complete API documentation
- **[Usage Examples](./docs/usage/)** - React, Express, and more
- **[Deployment Guides](./docs/deployment/)** - Deploy locally or to Render
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Solve common problems
- **[Architecture](./docs/ARCHITECTURE.md)** - How it works under the hood
- **[Contributing](./docs/development/contributing.md)** - Help improve the library

## 📋 Installation

```bash
npm install yt-search-lib
```

## 🔧 Configuration

```javascript
const client = new YouTubeClient({
  proxyUrl: 'https://your-proxy.com/proxy?url=', // Required for browsers
  useCache: true,                                    // Enable caching
  cacheMaxAge: 3600000                              // 1 hour cache TTL
});
```

See [API Reference](./docs/API.md) for all configuration options.

## ⚠️ Important: CORS Proxies

Browsers block direct requests to YouTube. You must use a CORS proxy:

- **Development**: `http://127.0.0.1:3000/proxy?url=` (run `npm run proxy:start`)
- **Production**: Deploy your own proxy or use [Render](./docs/deployment/render-deployment.md)

See [Deployment Guide](./docs/deployment/README.md) for options.

**Note:** requests carry YouTube's public InnerTube key as a `?key=` query
parameter, so the key can appear in proxy and server access logs. This is an
accepted risk — the key is not a secret (it ships in YouTube's own
client-side JavaScript). See [SECURITY.md](./SECURITY.md) for details.

## 💡 Common Use Cases

| Goal | Guide |
|------|-------|
| Search from React | [React Integration](./docs/usage/integration-react.md) |
| Build API backend | [Express.js Integration](./docs/usage/integration-express.md) |
| Deploy to production | [Deployment Options](./docs/deployment/README.md) |
| Handle errors | [Error Handling](./docs/usage/error-handling.md) |
| Optimize caching | [Caching Strategy](./docs/usage/caching-strategy.md) |
| Fix a problem | [Troubleshooting](./docs/TROUBLESHOOTING.md) |

## 🛠️ Development

```bash
npm run build          # Build the library
npm run test           # Run tests (offline)
npm run coverage       # Coverage report (offline)
npm run proxy:start    # Start local CORS proxy
npm run lint           # Run ESLint
npm run format         # Format with Prettier
```

Live integration tests require network access to YouTube and are **opt-in** —
both exit early unless `RUN_INTEGRATION=1` is set:

```bash
RUN_INTEGRATION=1 npm run test:integration        # via the public api.allorigins.win proxy (may be rate-limited)
RUN_INTEGRATION=1 npm run test:integration:proxy  # via the local proxy — keep `npm run proxy:start` running first
```

See [Development Guide](./docs/development/README.md) for details.

## 📄 License

MIT - See [LICENSE](./LICENSE) file for details

## 🤝 Contributing

We welcome contributions! See [Contributing Guide](./docs/development/contributing.md) and [Code of Conduct](./docs/community/code-of-conduct.md).

## 🆘 Support

- **Questions?** → [Support & Help](./docs/community/support.md)
- **Found a bug?** → [GitHub Issues](https://github.com/luongnv89/yt-search-lib/issues)
- **Have an idea?** → [GitHub Discussions](https://github.com/luongnv89/yt-search-lib/discussions)

---

**Ready to get started?** → [Full Documentation](./docs/README.md)
