# YouTube Search Library

A powerful, purely client-side JavaScript library for searching YouTube videos without an official API key. It uses YouTube's internal InnerTube API pattern and provides a high-performance, cached searching experience.

## ✨ Features

- **No API Key Required**: Works by emulating the internal YouTube web client.
- **100% Client-Side**: No server-side code needed (bypasses CORS via configurable proxies).
- **Persistent LRU Cache**: Automatically stores results in `localStorage` to save bandwidth and improve speed.
- **Rich Metadata**: Returns titles, high-res thumbnails, watch links, durations, view counts, and channel names.
- **Modular & Lightweight**: Zero dependencies, built with modern ES Modules.
- **Premium Demo**: Includes a state-of-the-art, glassmorphic search interface.

## 🚀 Quick Start

### 1. Installation

Simply copy the `src` directory into your project.

### 2. Usage

```javascript
import YouTubeClient from './src/index.js';

// Initialize the client
const client = new YouTubeClient({
  // Bypassing CORS is mandatory for browser usage
  proxyUrl: 'https://api.allorigins.win/raw?url=', 
  useCache: true,
  cacheMaxAge: 3600000 // 1 hour in ms
});

// Perform a search
async function search() {
  try {
    const results = await client.search('lofi hip hop', { limit: 5 });
    
    results.forEach(video => {
      console.log(`Title: ${video.title}`);
      console.log(`Link: ${video.link}`);
      console.log(`Thumbnail: ${video.thumbnail_url}`);
    });
  } catch (err) {
    console.error('Search failed:', err);
  }
}

search();
```

## 📂 Project Structure

- `src/index.js`: Main library entry point.
- `src/lib/parser.js`: Robust logic for parsing YouTube's complex JSON responses.
- `src/lib/transport.js`: Network layer with proxy and error handling.
- `src/lib/cache.js`: LocalStorage-based LRU caching mechanism.
- `src/lib/constants.js`: InnerTube configuration and API keys.
- `index.html`: A premium, responsive demo page.

## ⚙️ Configuration

The `YouTubeClient` constructor accepts an options object:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `proxyUrl` | `string` | `''` | Prefix URL for a CORS proxy. |
| `useCache` | `boolean` | `true` | Enable or disable localStorage caching. |
| `cacheMaxAge`| `number` | `3600000` | How long to keep results in cache (ms). |
| `clientContext`| `object` | `WEB` | Override the InnerTube client version/name. |

## ⚠️ Important Note on CORS

Browsers block direct requests to YouTube. To use this library in a browser, you **must** use a CORS proxy. 
- For development: `https://api.allorigins.win/raw?url=` or `https://cors-anywhere.herokuapp.com/`
- For production: It is highly recommended to host your own simple proxy server for stability and security.

## 📜 License

MIT
