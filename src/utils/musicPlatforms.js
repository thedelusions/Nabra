/**
 * Spotify & Apple Music Link Converter
 * Extracts track/playlist info and converts to YouTube search query
 */

import fetch from 'node-fetch';

const SPOTIFY_TRACK_REGEX = /spotify\.com\/track\/([a-zA-Z0-9]+)/;
const SPOTIFY_PLAYLIST_REGEX = /spotify\.com\/playlist\/([a-zA-Z0-9]+)/;
const SPOTIFY_ALBUM_REGEX = /spotify\.com\/album\/([a-zA-Z0-9]+)/;
const APPLE_MUSIC_REGEX = /music\.apple\.com\/([a-z]{2})\/(album|playlist|song)\/([^?]+)/;

/**
 * Check if URL is from Spotify or Apple Music
 */
export function isMusicPlatformUrl(url) {
  return url.includes('spotify.com') || url.includes('music.apple.com');
}

/**
 * Extract track/artist info from Spotify URL using public API
 */
async function getSpotifyInfo(url) {
  const trackMatch = url.match(SPOTIFY_TRACK_REGEX);
  const playlistMatch = url.match(SPOTIFY_PLAYLIST_REGEX);
  const albumMatch = url.match(SPOTIFY_ALBUM_REGEX);

  if (trackMatch) {
    const trackId = trackMatch[1];
    // Use Spotify's public embed API (no auth required)
    const response = await fetch(`https://open.spotify.com/embed/track/${trackId}`);
    const html = await response.text();
    
    // Extract title from meta tags
    const titleMatch = html.match(/<title>(.+?)<\/title>/);
    if (titleMatch) {
      // Format: "Track Name - Artist Name | Spotify"
      const fullTitle = titleMatch[1].replace(' | Spotify', '');
      return { type: 'track', query: fullTitle };
    }
  }

  if (playlistMatch || albumMatch) {
    return { type: 'playlist', query: url }; // Let Lavalink handle it
  }

  return null;
}

/**
 * Extract track/artist info from Apple Music URL
 */
async function getAppleMusicInfo(url) {
  const match = url.match(APPLE_MUSIC_REGEX);
  
  if (match) {
    const [, , type, slug] = match;
    
    // Extract readable title from URL slug
    // Example: "hotel-california/1440935467?i=1440935885" -> "hotel california"
    const title = slug.split('/')[0].replace(/-/g, ' ');
    
    if (type === 'song') {
      return { type: 'track', query: title };
    }
    
    if (type === 'album' || type === 'playlist') {
      return { type: 'playlist', query: title };
    }
  }

  return null;
}

/**
 * Convert Spotify/Apple Music URL to YouTube search query
 * @param {string} url - Spotify or Apple Music URL
 * @returns {Promise<string|null>} YouTube search query or null
 */
export async function convertMusicPlatformUrl(url) {
  try {
    if (url.includes('spotify.com')) {
      const info = await getSpotifyInfo(url);
      if (info) {
        return info.type === 'track' ? `ytsearch:${info.query}` : info.query;
      }
    }

    if (url.includes('music.apple.com')) {
      const info = await getAppleMusicInfo(url);
      if (info) {
        return info.type === 'track' ? `ytsearch:${info.query}` : info.query;
      }
    }

    return null;
  } catch (error) {
    console.error('Error converting music platform URL:', error);
    return null;
  }
}

/**
 * Get platform name from URL
 */
export function getPlatformName(url) {
  if (url.includes('spotify.com')) return 'Spotify';
  if (url.includes('music.apple.com')) return 'Apple Music';
  return 'Unknown';
}
