# Project Architecture

This document describes the high-level architecture of the YouTube Search library.

## Modular Design

The library is built with a modular approach, separating concerns into distinct components:

### 1. `YouTubeClient` (The Orchestrator)
The main entry point of the library. It coordinates between the Transport, Parser, and Cache modules. It manages the search lifecycle and applies high-level logic like result limiting and type filtering.

### 2. `Transport` (Network Layer)
Handles all HTTP communication with YouTube's servers. 
- **CORS Proxy Support**: Since browsers block direct requests to YouTube, the Transport layer allows prepending a proxy URL to bypass CORS restrictions.
- **Request Management**: Configures headers and body for POST requests to the InnerTube API.

### 3. `Parser` (Data Extraction)
YouTube's InnerTube API returns highly nested and complex JSON structures. The Parser module:
- Navigates the "renderer" patterns (e.g., `videoRenderer`, `channelRenderer`).
- Extracts metadata such as IDs, titles, thumbnail URLs, durations, and view counts.
- **Normalization**: Converts various YouTube text formats (runs, simpleText) into standard strings.

### 4. `Cache` (Persistence Layer)
A lightweight LRU (Least Recently Used) cache implementation.
- **LocalStorage**: Persists search results in the browser's `localStorage`.
- **Expiration**: Automatically invalidates entries older than the configured `maxAge`.
- **Capacity Management**: Evicts oldest entries when the cache reaches its limit to save space.

---

## Data Flow

The following flow illustrates how a search query is processed:

1. **Input**: User calls `client.search("query")`.
2. **Cache Check**: `YouTubeClient` generates a unique cache key and checks the `LRUCache`.
   - *Hit*: Returns results immediately.
   - *Miss*: Continues to fetch.
3. **InnerTube Request**: `YouTubeClient` constructs the request body with the user's query and the required `clientContext`.
4. **Fetch via Proxy**: `Transport` sends a POST request to the InnerTube search endpoint, optionally routing through a CORS proxy.
5. **Parse & Normalize**: `Parser` receives the raw JSON response, traverses the tree, and extracts a flat array of result objects.
6. **Cache Update**: The normalized results are stored in the `LRUCache`.
7. **Output**: The filtered and limited results are returned as a Promise.

---

## InnerTube API

This library utilizes YouTube's **InnerTube API**, which is the private API used by YouTube's official web and mobile applications. 

Unlike the official Data API v3:
- It does not require an OAuth token or a Google Cloud API Key (it uses a public API key found in the YouTube web client's source code).
- It requires a `context` object in every request, specifying the client type (e.g., `WEB`, `ANDROID`, `IOS`) and version.
- The responses are structured specifically for rendering UI components, necessitating robust parsing logic.
