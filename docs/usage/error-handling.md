# Error Handling & Retry Logic

Handle errors gracefully and implement retry strategies.

## 🚀 Basic Error Handling

```javascript
import { YouTubeClient } from 'yt-search-lib';

const client = new YouTubeClient({
  proxyUrl: 'http://127.0.0.1:3000/proxy?url='
});

try {
  const results = await client.search('lofi', { limit: 5 });
  console.log(`Found ${results.length} results`);
} catch (error) {
  console.error('Search failed:', error.message);
}
```

## 🔄 Retry with Exponential Backoff

```javascript
async function searchWithRetry(query, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);
      return await client.search(query, { limit: 5 });
    } catch (error) {
      lastError = error;
      console.log(`Failed: ${error.message}`);

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`Search failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Usage
const results = await searchWithRetry('javascript');
```

## ⏱️ Timeout Handling

```javascript
async function searchWithTimeout(query, timeoutMs = 10000) {
  const searchPromise = client.search(query, { limit: 5 });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error('Search timeout')),
      timeoutMs
    )
  );

  try {
    return await Promise.race([searchPromise, timeoutPromise]);
  } catch (error) {
    if (error.message === 'Search timeout') {
      console.log(`Search took longer than ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Usage
try {
  const results = await searchWithTimeout('lofi', 5000);
} catch (error) {
  console.error('Failed:', error.message);
}
```

## 🔍 Error Type Detection

The library throws typed errors — `NetworkError` and `ParseError`, both
subclasses of `YtSearchError` — so detect the failure by type, not by
matching engine-specific message strings.

```javascript
import { NetworkError, ParseError, YtSearchError } from 'yt-search-lib';

async function searchWithErrorHandling(query) {
  try {
    return await client.search(query);
  } catch (error) {
    if (error instanceof NetworkError) {
      console.log('Network error - check proxy URL or internet connection');
    } else if (error instanceof ParseError) {
      console.log('Malformed API response - the InnerTube shape may have changed');
    } else if (error.message.includes('timed out')) {
      console.log('Request timed out - try again or check network');
    } else if (error.message.includes('429')) {
      console.log('Rate limited - wait before retrying');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.log('Authentication error - check proxy configuration');
    } else {
      console.log(`Unknown error: ${error.message}`);
    }
    throw error;
  }
}
```

## 🛡️ Validation

```javascript
async function validateSearch(query) {
  // Validate input
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  if (query.length < 2) {
    throw new Error('Query too short (minimum 2 characters)');
  }

  if (query.length > 500) {
    throw new Error('Query too long (maximum 500 characters)');
  }

  return await client.search(query);
}

// Usage
try {
  const results = await validateSearch('lo');
} catch (error) {
  console.error('Validation error:', error.message);
}
```

## 📊 Complete Example

```javascript
async function robustSearch(query, options = {}) {
  const {
    maxRetries = 3,
    timeoutMs = 10000,
    retryDelay = 1000
  } = options;

  // Validate
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Search attempt ${attempt}/${maxRetries}...`);

      // Add timeout
      const searchPromise = client.search(query, { limit: 5 });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      );

      const results = await Promise.race([searchPromise, timeoutPromise]);

      if (results.length === 0) {
        console.warn('No results found');
        return [];
      }

      return results;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (error.message.includes('timed out')) {
        console.error(`Timeout after ${timeoutMs}ms`);
      } else if (error instanceof NetworkError) {
        console.error('Network error');
      } else {
        console.error(`Error: ${error.message}`);
      }

      if (isLastAttempt) {
        throw new Error(`Search failed after ${maxRetries} attempts`);
      }

      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage
try {
  const results = await robustSearch('javascript', {
    maxRetries: 3,
    timeoutMs: 15000,
    retryDelay: 1000
  });
  console.log('Results:', results);
} catch (error) {
  console.error('Failed:', error.message);
}
```

## 💡 Tips

- **Always use try/catch** - Network errors can happen
- **Implement retries** - Temporary failures are common
- **Set timeouts** - Prevent hanging requests
- **Validate input** - Check query before searching
- **Log errors** - Help debug issues in production
- **Notify users** - Tell them what went wrong

---

**← [Back to Usage Examples](./README.md)**
