# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-12

### Added
- **Initial Release** of YouTube Search Library.
- **No API Key Required**: Fully functional search using YouTube's internal InnerTube API pattern.
- **Client-Side Support**: Designed for browser environments with built-in CORS proxy support.
- **Persistent LRU Cache**: Automatic `localStorage` caching with configurable TTL and capacity.
- **Rich Metadata Extraction**:
    - Video title, ID, link, and high-res thumbnails.
    - Video duration, view count, and publication date.
    - Channel information (title, ID, subscriber count).
    - Playlist support.
- **Premium Demo Page**: Modern glassmorphic UI showcasing library capabilities.
- **Modular Architecture**: Zero-dependency ES module structure.
- **Documentation**: Comprehensive API, Architecture, Development, and Troubleshooting guides.

---

[1.0.0]: https://github.com/sisyphus-labs/yt-search-lib/releases/tag/v1.0.0
