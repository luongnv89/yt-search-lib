/**
 * Parser for InnerTube API search responses.
 * Extracts useful video information from the deeply nested JSON structure.
 * 
 * @module parser
 */

/**
 * @typedef {Object} Thumbnail
 * @property {string} url
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} VideoResult
 * @property {string} id
 * @property {string} type - 'video', 'playlist', 'channel'
 * @property {string} title
 * @property {Thumbnail[]} thumbnails
 * @property {string} author
 * @property {string} duration
 * @property {string} publishedAt
 * @property {string} viewCount
 */

/**
 * Extract text from a run or simple text object.
 * @param {Object} data 
 * @returns {string}
 */
function getText(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (data.simpleText) return data.simpleText;
  if (data.runs) return data.runs.map(r => r.text).join('');
  return '';
}

/**
 * Parse a single video renderer item.
 * @param {Object} item 
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
    badges: video.badges?.map(b => b.metadataBadgeRenderer?.label).filter(Boolean) || []
  };
}

/**
 * Parse a channel renderer item.
 * @param {Object} item 
 * @returns {Object|null}
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
    videoCount: getText(channel.videoCountText)
  };
}

/**
 * Parse a playlist renderer item.
 * @param {Object} item 
 * @returns {Object|null}
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
    author: getText(playlist.longBylineText)
  };
}


/**
 * Main parser function for search response.
 * @param {Object} response - Raw JSON response from InnerTube.
 * @returns {VideoResult[]}
 */
export function parseSearchResults(response) {
  const results = [];
  
  try {
    const contents = response.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    if (!contents) {
        // Sometimes the structure might be different (e.g. continuations), but for search it's usually this.
        return [];
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
    console.error('Error parsing search results:', e);
  }

  return results;
}
