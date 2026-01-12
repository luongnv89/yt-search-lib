# Local Development Guide

This guide provides detailed instructions for setting up and developing the YouTube Search library.

## 🚀 Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/youtube-search.git
   cd youtube-search
   ```

2. **Run a Local Server**:
   Since the project uses ES Modules, you cannot open `index.html` directly from the file system. Use a local server:
   ```bash
   # Using npx and http-server
   npx http-server .
   ```
   Then open `http://localhost:8080` in your browser.

## 🧪 Testing with the `test.js` Pattern

We follow a lightweight `test.js` pattern for verification. This involves creating a standalone script to exercise the library's functionality.

### Example `test.js`
Create a file named `test.js` in the root directory:

```javascript
import YouTubeClient from './src/index.js';

async function runTest() {
  console.log('--- Starting YouTube Search Test ---');
  
  const client = new YouTubeClient({
    proxyUrl: 'https://api.allorigins.win/raw?url=',
    useCache: false
  });

  try {
    const results = await client.search('interstellar soundtrack');
    console.log(`✅ Success! Found ${results.length} results.`);
    
    if (results.length > 0) {
      console.log('First Result:', results[0].title);
    }
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
}

runTest();
```

### Running the Test
You can run this test directly in a Node environment (version 14+) or by importing it into a temporary HTML file.

**Node.js**:
```bash
node test.js
```
*(Note: Ensure your Node environment supports fetch or provide a fetch polyfill if running outside the browser.)*

## 🎨 Visual Testing with `index.html`

The `index.html` file serves as a "Premium Demo" and a visual testing playground.

1. **Open the Demo**: Navigate to your local server URL (e.g., `http://localhost:8080`).
2. **Verify UI Components**: Ensure the glassmorphic design, animations, and responsive layout are working as expected.
3. **Debug Logic**: Use the browser's DevTools to inspect network requests to InnerTube and verify that results are correctly cached in `localStorage` (check the Application tab).
4. **Proxy Testing**: If search fails, check if the CORS proxy in `index.html` (currently AllOrigins) is responsive.

## 📂 Internal Architecture

- **`src/index.js`**: Orchestrates the search flow and cache management.
- **`src/lib/transport.js`**: Handles the fetch requests and proxy logic.
- **`src/lib/parser.js`**: The most complex part—handles the extraction of data from YouTube's nested JSON structure.
- **`src/lib/cache.js`**: Implements a simple LRU cache using `localStorage`.

When modifying `parser.js`, always verify your changes against multiple search queries to ensure the parsing logic is robust against different YouTube response formats.
