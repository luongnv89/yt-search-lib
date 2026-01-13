# YouTube Search Library - Documentation

Welcome! This is the complete documentation for the **YouTube Search Library** - a powerful, client-side JavaScript library for searching YouTube without an API key.

Whether you're using the library, deploying a proxy, or contributing code, you'll find what you need here.

## 🚀 Getting Started

**New to the library?** Start here:

1. **[Quick Start Guide](./guides/quick-start.md)** - Get up and running in 5 minutes
2. **[First Search Example](./guides/first-search.md)** - Your first working code example
3. **[Configuration Guide](./guides/configuration.md)** - Understand all options

## 📚 Documentation by Type

### For Library Users

- **[Usage Examples](./usage/)** - Code examples for integration
  - [Basic Search](./usage/basic-search.md)
  - [Advanced Patterns](./usage/advanced-search.md)
  - [React Integration](./usage/integration-react.md)
  - [Express.js Backend](./usage/integration-express.md)
  - [Error Handling](./usage/error-handling.md)
  - [Caching Strategies](./usage/caching-strategy.md)

- **[API Reference](./api/)** - Complete API documentation
  - [API Overview](./api/reference.md)
  - [Constructor Options](./api/options.md)
  - [Response Format](./api/response-format.md)
  - [Types & Interfaces](./api/types.md)

- **[Deployment Guides](./deployment/)** - How to host and deploy
  - [Deployment Overview](./deployment/README.md) - Choose your deployment
  - [Local Proxy Setup](./deployment/local-proxy.md) - Development environment
  - [Render Deployment](./deployment/render-deployment.md) - Cloud hosting
  - [Custom Proxy](./deployment/custom-proxy.md) - Build your own proxy
  - [Security Guide](./deployment/security.md) - Security best practices

### For Troubleshooting

- **[Troubleshooting Guide](./troubleshooting/)** - Solve common problems
  - [CORS Errors](./troubleshooting/cors-errors.md)
  - [No Results](./troubleshooting/no-results.md)
  - [Performance Issues](./troubleshooting/performance.md)
  - [YouTube Blocking](./troubleshooting/youtube-blocking.md)
  - [Network Errors](./troubleshooting/network-errors.md)

### For Understanding the System

- **[Architecture & Design](./architecture/)** - How it all works
  - [Architecture Overview](./architecture/overview.md)
  - [Modules & Components](./architecture/modules.md)
  - [Data Flow](./architecture/data-flow.md)
  - [InnerTube API Details](./architecture/innertube-api.md)
  - [Parser Logic](./architecture/parser-logic.md)
  - [Cache Implementation](./architecture/cache-implementation.md)

### For Contributors

- **[Development Guide](./development/)** - How to contribute
  - [Setup Guide](./development/setup.md) - Local development
  - [Testing](./development/testing.md) - Running and writing tests
  - [Code Standards](./development/code-standards.md) - Code conventions
  - [Contributing Guide](./development/contributing.md) - How to contribute
  - [Building](./development/building.md) - Build process
  - [Releasing](./development/releasing.md) - Publishing to npm

### Community

- **[Code of Conduct](./community/code-of-conduct.md)** - Community standards
- **[Support & Help](./community/support.md)** - Getting help
- **[Changelog](./community/changelog.md)** - Version history

---

## 🎯 Common Tasks

### I want to...

**Search YouTube from my React app**
→ [React Integration Guide](./usage/integration-react.md)

**Build a backend API**
→ [Express.js Integration](./usage/integration-express.md)

**Deploy the proxy to production**
→ [Deployment Overview](./deployment/README.md)

**Understand how search works**
→ [Architecture Overview](./architecture/overview.md)

**Fix a problem I'm having**
→ [Troubleshooting Index](./troubleshooting/README.md)

**Contribute to the project**
→ [Contributing Guide](./development/contributing.md)

**Configure caching**
→ [Caching Strategy Guide](./usage/caching-strategy.md)

**Handle errors gracefully**
→ [Error Handling](./usage/error-handling.md)

---

## 📋 Quick Reference

### Installation

```bash
npm install yt-search-lib
```

### Basic Example

```javascript
import { YouTubeClient } from 'yt-search-lib';

const client = new YouTubeClient({
  proxyUrl: 'http://127.0.0.1:3000/proxy?url='
});

const results = await client.search('lofi hip hop', { limit: 5 });
console.log(results);
```

### Key Features

- ✅ No API key required
- ✅ 100% client-side
- ✅ Built-in caching
- ✅ Full TypeScript support
- ✅ Zero dependencies
- ✅ Works in browsers and Node.js

---

## 🆘 Need Help?

- **General questions** → [Support & Help](./community/support.md)
- **Something broken** → [Troubleshooting](./troubleshooting/README.md)
- **Want to report a bug** → [GitHub Issues](https://github.com/luongnv89/yt-search-lib/issues)
- **Have a feature idea** → [GitHub Discussions](https://github.com/luongnv89/yt-search-lib/discussions)

---

## 📖 Documentation Index

View the complete [Site Map](./index.md) for all documentation files organized by category.

---

**Last Updated**: January 2024 | **License**: MIT
