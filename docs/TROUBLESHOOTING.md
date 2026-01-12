# Troubleshooting

Common issues and solutions for the YouTube Search library.

## 1. CORS Errors (Cross-Origin Resource Sharing)

**Symptoms**: 
- Console errors like `Access-Control-Allow-Origin header is missing`.
- Requests to `youtube.com` fail with status `(blocked:cors)`.

**Solution**:
YouTube's InnerTube API does not allow direct requests from browsers. You **must** use a CORS proxy.
- **Development**: Use `https://api.allorigins.win/raw?url=` or `https://cors-anywhere.herokuapp.com/`.
- **Production**: Host your own proxy (e.g., using a simple Node.js/Express server or a Cloudflare Worker) to avoid rate limits and ensure stability.

```javascript
const client = new YouTubeClient({
  proxyUrl: 'https://your-private-proxy.com/?url='
});
```

## 2. "No results found" or Empty Arrays

**Symptoms**:
- Search returns `[]` even for common queries.
- No errors in the console.

**Possible Causes**:
1.  **Proxy Issues**: The proxy might be stripping headers or failing to forward the request correctly. Check the "Network" tab in DevTools to see the proxy's response.
2.  **InnerTube Structure Change**: YouTube frequently updates its internal JSON structure. If `src/lib/parser.js` can no longer find the data at the expected paths, it will return an empty array.
3.  **Rate Limiting**: If using a public proxy, you might be rate-limited by YouTube or the proxy provider.

**Debugging**:
- Enable verbose logging in `src/lib/transport.js` to see the raw response from the proxy.
- Check if the response contains a `contents` field. If the structure has changed, you may need to update the selectors in `parseSearchResults` within `src/lib/parser.js`.

## 3. Network Error: Failed to fetch

**Symptoms**:
- Error message: `Network error: Failed to connect. Check your internet connection or proxy settings.`

**Solution**:
- Verify your internet connection.
- Check if the `proxyUrl` is correct and reachable.
- If using `https`, ensure the proxy also supports `https`.

## 4. Cache Not Working

**Symptoms**:
- Repeated searches for the same term still trigger network requests.

**Solution**:
- Ensure `useCache` is not set to `false`.
- Check if `localStorage` is full or disabled in your browser.
- Verify `cacheMaxAge` is set to a reasonable value (default is 1 hour).

---

If you encounter an issue not listed here, please [open an issue](https://github.com/sisyphus-labs/youtube-search/issues) on GitHub.
