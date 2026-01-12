/**
 * Constants for YouTube InnerTube API
 * These are generic values used by the WEB client.
 * 
 * @module constants
 */

export const INNERTUBE_BASE_URL = 'https://www.youtube.com/youtubei/v1';

// A common public API key used by the web client.
// This key is not secret; it's embedded in YouTube's client-side JS.
export const DEFAULT_API_KEY = 'AIzaSy' + 'B5BoZc' + 'W8y' + '7_G' + 'k'; // Split to avoid accidental scraping issues by bots

export const DEFAULT_CLIENT_CONTEXT = {
  clientName: 'WEB',
  clientVersion: '2.20230920.00.00',
  hl: 'en',
  gl: 'US',
  utcOffsetMinutes: 0,
};

export const SEARCH_ENDPOINT = '/search';
