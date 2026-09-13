# Express.js Backend Integration

Build a YouTube search API with Express.js.

## 🚀 Basic API

```javascript
import express from 'express';
import { YouTubeClient, NetworkError } from 'yt-search-lib';

const app = express();
const client = new YouTubeClient({
  proxyUrl: process.env.YOUTUBE_PROXY_URL,
  useCache: true
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q, limit = 5, type = 'video' } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query required' });
    }

    const results = await client.search(q, {
      limit: parseInt(limit),
      type
    });

    res.json({
      query: q,
      resultCount: results.length,
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

**Usage:**
```bash
curl "http://localhost:3000/api/search?q=lofi&limit=10&type=video"
```

## 📚 Multiple Endpoints

```javascript
// Search for videos
app.get('/api/videos', async (req, res) => {
  const { q, limit = 10 } = req.query;
  const results = await client.search(q, {
    limit: parseInt(limit),
    type: 'video'
  });
  res.json(results);
});

// Search for channels
app.get('/api/channels', async (req, res) => {
  const { q, limit = 5 } = req.query;
  const results = await client.search(q, {
    limit: parseInt(limit),
    type: 'channel'
  });
  res.json(results);
});

// Search for playlists
app.get('/api/playlists', async (req, res) => {
  const { q, limit = 5 } = req.query;
  const results = await client.search(q, {
    limit: parseInt(limit),
    type: 'playlist'
  });
  res.json(results);
});

// Search all types
app.get('/api/all', async (req, res) => {
  const { q, limit = 10 } = req.query;
  const results = await client.search(q, {
    limit: parseInt(limit),
    type: 'all'
  });
  res.json(results);
});
```

## 🛡️ Error Handling Middleware

```javascript
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.message.includes('timed out')) {
    return res.status(504).json({ error: 'Request timeout' });
  }

  if (err instanceof NetworkError) {
    return res.status(502).json({ error: 'Bad gateway' });
  }

  res.status(500).json({ error: 'Internal server error' });
});
```

## 🔄 Request Validation

```javascript
function validateSearchQuery(req, res, next) {
  const { q, limit, type } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Invalid query' });
  }

  if (q.length < 2 || q.length > 500) {
    return res.status(400).json({
      error: 'Query length must be 2-500 characters'
    });
  }

  if (limit && (isNaN(limit) || limit < 1 || limit > 50)) {
    return res.status(400).json({
      error: 'Limit must be 1-50'
    });
  }

  const validTypes = ['video', 'channel', 'playlist', 'all'];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({
      error: `Type must be one of: ${validTypes.join(', ')}`
    });
  }

  next();
}

app.get('/api/search', validateSearchQuery, async (req, res) => {
  const { q, limit = 5, type = 'video' } = req.query;
  const results = await client.search(q, {
    limit: parseInt(limit),
    type
  });
  res.json(results);
});
```

## 📊 Response Formatting

```javascript
// Consistent response format
function formatResponse(data, message = 'Success') {
  return {
    status: 'success',
    message,
    timestamp: new Date().toISOString(),
    data
  };
}

app.get('/api/search', async (req, res) => {
  const { q, limit = 5 } = req.query;

  try {
    const results = await client.search(q, { limit: parseInt(limit) });
    res.json(formatResponse({
      query: q,
      resultCount: results.length,
      results
    }, `Found ${results.length} results`));
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## 🔒 Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);

app.get('/api/search', async (req, res) => {
  // Rate limited endpoint
});
```

## 💾 Caching

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

app.get('/api/search', async (req, res) => {
  const { q, limit = 5 } = req.query;
  const cacheKey = `search:${q}:${limit}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({
      ...cached,
      fromCache: true
    });
  }

  // Fetch from YouTube
  const results = await client.search(q, { limit: parseInt(limit) });

  // Store in cache
  cache.set(cacheKey, {
    query: q,
    resultCount: results.length,
    results
  });

  res.json({
    query: q,
    resultCount: results.length,
    results,
    fromCache: false
  });
});
```

## 🧪 Complete Example

```javascript
import express from 'express';
import rateLimit from 'express-rate-limit';
import { YouTubeClient } from 'yt-search-lib';

const app = express();

const client = new YouTubeClient({
  proxyUrl: process.env.YOUTUBE_PROXY_URL,
  useCache: true
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Middleware
app.use(express.json());
app.use('/api/', limiter);

// Validation middleware
const validateSearch = (req, res, next) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Invalid query' });
  }
  next();
};

// Routes
app.get('/api/search', validateSearch, async (req, res) => {
  try {
    const { q, limit = 5, type = 'video' } = req.query;

    const results = await client.search(q, {
      limit: parseInt(limit),
      type
    });

    res.json({
      status: 'success',
      query: q,
      resultCount: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

**Usage:**
```bash
curl "http://localhost:3000/api/search?q=javascript&limit=10"
```

---

**← [Back to Usage Examples](./README.md)**
