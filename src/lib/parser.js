/**
 * Parser for InnerTube API search responses.
 * Extracts useful video information from the deeply nested JSON structure.
 *
 * @module parser
 */

import { ParseError } from './errors.js';

/**
 * A thumbnail entry in an InnerTube `thumbnail` list.
 * @typedef {object} Thumbnail
 * @property {string} url
 * @property {number} width
 * @property {number} height
 */

/**
 * A normalized search result. Videos, channels and playlists share one shape;
 * fields beyond `type`/`id`/`title`/`thumbnails` depend on the result type.
 * @typedef {object} VideoResult
 * @property {'video'|'channel'|'playlist'} type
 * @property {string} id
 * @property {string} title
 * @property {Thumbnail[]} thumbnails
 * @property {string} [link] - Watch URL (videos only).
 * @property {string} [thumbnail_url] - Largest thumbnail URL (videos only).
 * @property {string} [author] - Channel name (videos and playlists).
 * @property {string} [duration] - Formatted length (videos only).
 * @property {string} [publishedAt] - Relative publish time (videos only).
 * @property {string} [viewCount] - Formatted view count (videos only).
 * @property {string[]} [badges] - Badge labels (videos only).
 * @property {string} [description] - Description snippet (channels only).
 * @property {string} [subscriberCount] - Formatted subscriber count (channels only).
 * @property {string} [videoCount] - Formatted video count (channels and playlists).
 */

/**
 * Raw InnerTube text node — either a `simpleText` leaf or a `runs` array.
 * A bare string is tolerated for robustness.
 * @typedef {string|{simpleText?: string, runs?: {text: string}[]}} InnerTubeText
 */

/**
 * The subset of `videoRenderer` fields this parser reads.
 * @typedef {object} InnerTubeVideoRenderer
 * @property {string} videoId
 * @property {InnerTubeText} [title]
 * @property {{thumbnails?: Thumbnail[]}} [thumbnail]
 * @property {InnerTubeText} [ownerText]
 * @property {InnerTubeText} [lengthText]
 * @property {InnerTubeText} [publishedTimeText]
 * @property {InnerTubeText} [viewCountText]
 * @property {{metadataBadgeRenderer?: {label?: string}}[]} [badges]
 */

/**
 * The subset of `channelRenderer` fields this parser reads.
 * @typedef {object} InnerTubeChannelRenderer
 * @property {string} channelId
 * @property {InnerTubeText} [title]
 * @property {{thumbnails?: Thumbnail[]}} [thumbnail]
 * @property {InnerTubeText} [descriptionSnippet]
 * @property {InnerTubeText} [subscriberCountText]
 * @property {InnerTubeText} [videoCountText]
 */

/**
 * The subset of `playlistRenderer` fields this parser reads.
 * @typedef {object} InnerTubePlaylistRenderer
 * @property {string} playlistId
 * @property {InnerTubeText} [title]
 * @property {{thumbnails?: Thumbnail[]}[]} [thumbnails]
 * @property {InnerTubeText} [videoCountText]
 * @property {InnerTubeText} [longBylineText]
 */

/**
 * A single entry inside `itemSectionRenderer.contents` — exactly one renderer
 * key is populated per item.
 * @typedef {object} InnerTubeItem
 * @property {InnerTubeVideoRenderer} [videoRenderer]
 * @property {InnerTubeChannelRenderer} [channelRenderer]
 * @property {InnerTubePlaylistRenderer} [playlistRenderer]
 */

/**
 * Raw InnerTube search response. The payload shape is guarded at runtime:
 * `parseSearchResults` validates the section-list contents array before use.
 * @typedef {object} InnerTubeResponse
 * @property {object} [contents]
 */

/**
 * Extract text from a run or simple text object.
 * @param {InnerTubeText} [data]
 * @returns {string}
 */
function getText(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (data.simpleText) return data.simpleText;
  if (data.runs) return data.runs.map((r) => r.text).join('');
  return '';
}

/**
 * Parse a single video renderer item.
 * @param {InnerTubeItem} item
 * @returns {VideoResult|null}
 */
function parseVideoRenderer(item) {
  const video = item.videoRenderer;
  if (!video) return null;

  return {
    type: 'video',
    id: video.videoId,
    link: `https://www.youtube.com/watch?v=${video.videoId}`,
    title: getText(video.title),
    thumbnails: video.thumbnail?.thumbnails || [],
    thumbnail_url: video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url || '',
    author: getText(video.ownerText),
    duration: getText(video.lengthText),
    publishedAt: getText(video.publishedTimeText),
    viewCount: getText(video.viewCountText),
    badges: video.badges?.map((b) => b.metadataBadgeRenderer?.label).filter(Boolean) || [],
  };
}

/**
 * Parse a channel renderer item.
 * @param {InnerTubeItem} item
 * @returns {VideoResult|null}
 */
function parseChannelRenderer(item) {
  const channel = item.channelRenderer;
  if (!channel) return null;

  return {
    type: 'channel',
    id: channel.channelId,
    title: getText(channel.title),
    thumbnails: channel.thumbnail?.thumbnails || [],
    description: getText(channel.descriptionSnippet),
    subscriberCount: getText(channel.subscriberCountText),
    videoCount: getText(channel.videoCountText),
  };
}

/**
 * Parse a playlist renderer item.
 * @param {InnerTubeItem} item
 * @returns {VideoResult|null}
 */
function parsePlaylistRenderer(item) {
  const playlist = item.playlistRenderer;
  if (!playlist) return null;

  return {
    type: 'playlist',
    id: playlist.playlistId,
    title: getText(playlist.title),
    thumbnails: playlist.thumbnails?.[0]?.thumbnails || [], // Playlists have a slightly different structure
    videoCount: getText(playlist.videoCountText),
    author: getText(playlist.longBylineText),
  };
}

/**
 * Main parser function for search response.
 * @param {InnerTubeResponse} response - Raw JSON response from InnerTube.
 * @returns {VideoResult[]}
 * @throws {ParseError} When the response is not a recognizable search payload.
 *   A malformed response is surfaced as a typed error so it stays
 *   distinguishable from a real empty result set (`[]`).
 */
export function parseSearchResults(response) {
  const results = [];

  try {
    const contents =
      response?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents;

    if (!Array.isArray(contents)) {
      // A search response always carries the section-list contents array,
      // even when it holds no items. A payload without it is malformed —
      // surface that instead of masquerading as an empty result set.
      throw new ParseError('Malformed search response: missing sectionListRenderer contents');
    }

    for (const section of contents) {
      if (section.itemSectionRenderer) {
        for (const item of section.itemSectionRenderer.contents) {
          let parsedItem = null;
          if (item.videoRenderer) {
            parsedItem = parseVideoRenderer(item);
          } else if (item.channelRenderer) {
            parsedItem = parseChannelRenderer(item);
          } else if (item.playlistRenderer) {
            parsedItem = parsePlaylistRenderer(item);
          }

          if (parsedItem) {
            results.push(parsedItem);
          }
        }
      }
    }
  } catch (e) {
    // A mid-parse failure is a malformed payload too — surface it as a typed
    // error rather than returning silently truncated results.
    if (e instanceof ParseError) throw e;
    throw new ParseError('Failed to parse search results', { cause: e });
  }

  return results;
}
