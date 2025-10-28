import play from 'play-dl';
import logger from './logger.js';
import { spawn } from 'child_process';

/**
 * Unified search function
 * Tries Lavalink first, falls back to play-dl
 * @param {LavalinkManager} manager - Lavalink manager instance
 * @param {string} query - Search query or URL
 * @param {Object} user - Discord user who requested
 * @returns {Promise<Array>} - Array of tracks
 */
export async function unifiedSearch(manager, query, user) {
  try {
    // Try Lavalink search first
    const hasConnectedNodes = manager && 
                              manager.nodeManager && 
                              manager.nodeManager.nodes && 
                              manager.nodeManager.nodes.size > 0 &&
                              Array.from(manager.nodeManager.nodes.values()).some(n => n.connected);

    if (hasConnectedNodes) {
      // Some versions of the lavalink-client expose a `search` helper on the manager,
      // but not all do. Guard the call to avoid crashing if it's missing.
      if (typeof manager.search === 'function') {
        try {
          const source = determineSource(query);
          logger.info(`Searching via Lavalink with source: ${source}, query: ${query}`);
          const results = await manager.search({ query, source }, user);

          logger.info(`Lavalink search result:`, {
            tracksFound: results?.tracks?.length || 0,
            hasPlaylist: !!results?.playlist,
            playlistName: results?.playlist?.name
          });

          if (results && results.tracks && results.tracks.length > 0) {
            logger.info(`✓ Found ${results.tracks.length} tracks via Lavalink`);
            return { tracks: results.tracks, playlist: results.playlist || null, source: 'lavalink' };
          }
          logger.warn('Lavalink search returned no results, falling back to play-dl');
        } catch (lavalinkError) {
          logger.error('Lavalink search failed:', { message: lavalinkError.message, stack: lavalinkError.stack });
        }
      } else {
        logger.warn('Lavalink manager.search is not available in this lavalink-client version; attempting direct node REST loadTracks fallback');
        try {
          const restResults = await loadTracksFromLavalinkNode(manager, query);
          if (restResults && restResults.tracks && restResults.tracks.length > 0) {
            logger.info(`✓ Found ${restResults.tracks.length} tracks via Lavalink node REST`);
            return { tracks: restResults.tracks, playlist: restResults.playlist || null, source: 'lavalink' };
          }
          logger.warn('Lavalink node REST returned no results, falling back to play-dl');
        } catch (restError) {
          logger.error('Lavalink node REST search failed:', { message: restError.message, stack: restError.stack });
        }
      }
    } else {
      logger.info('No connected Lavalink nodes available, using play-dl');
    }

    // Fallback to play-dl
    logger.debug(`Searching via play-dl: ${query}`);
    const playDlResults = await searchWithPlayDl(query);
    
    if (playDlResults && playDlResults.length > 0) {
      logger.info(`Found ${playDlResults.length} tracks via play-dl`);
      return {
        tracks: playDlResults,
        playlist: null,
        source: 'play-dl'
      };
    }

    logger.error(`No results found for query: ${query}`);
    return { tracks: [], playlist: null, source: null };

  } catch (error) {
    logger.error('Search error:', error);
    throw error;
  }
}

/**
 * Load tracks directly from a connected Lavalink node via its REST API.
 * Tries both /v4/loadtracks and /loadtracks endpoints and converts the Lavalink
 * response into the shape expected by the rest of the bot (tracks with `track` + `info`).
 */
async function loadTracksFromLavalinkNode(manager, identifier) {
  if (!manager || !manager.nodeManager) return null;

  const nodes = Array.from(manager.nodeManager.nodes.values());
  const node = nodes.find(n => n.connected) || nodes[0];
  if (!node) throw new Error('No Lavalink node available for REST load');

  const opts = node.options || {};
  const host = opts.host || opts.hostname || opts.ip || opts.address;
  const port = opts.port || (opts.secure ? 443 : 2333);
  const secure = !!opts.secure;
  const password = opts.authorization || opts.password || opts.auth || opts.token;
  const base = secure ? 'https' : 'http';

  if (!host) throw new Error('Lavalink node host not available');

  const pathsToTry = ['/v4/loadtracks', '/loadtracks'];

  for (const p of pathsToTry) {
    const url = `${base}://${host}:${port}${p}?identifier=${encodeURIComponent(identifier)}`;
    // Log node options and URL at info level so diagnostics are visible in normal logs
    logger.info('Lavalink REST node options:', opts);
    logger.info(`Attempting Lavalink REST load: ${url}`);

    try {
      const res = await globalThis.fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': password || '',
          'User-Agent': 'please-work-bot/1.0'
        }
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '<no body>');
        logger.warn(`Lavalink REST ${url} returned status ${res.status}, body: ${text}`);
        // try next path
        continue;
      }

      const data = await res.json().catch(async (e) => {
        const text = await res.text().catch(() => '<no body>');
        logger.error(`Failed to parse JSON from Lavalink REST ${url}: ${e.message}, body: ${text}`);
        return null;
      });
      if (!data) continue;

      // Lavalink v4 response structure:
      // - loadType: "track" → single track in data object
      // - loadType: "search" → array of tracks in data array
      // - loadType: "playlist" → tracks in data.tracks array
      // - loadType: "empty" or "error" → no tracks
      
      let tracks = [];
      let playlist = null;
      
      if (data.loadType === 'track' && data.data) {
        // Single track: data is the track object itself
        const trackData = data.data;
        tracks = [{
          encoded: trackData.encoded,
          info: {
            identifier: trackData.info?.identifier,
            isSeekable: trackData.info?.isSeekable !== false,
            author: trackData.info?.author || 'Unknown',
            length: trackData.info?.length || trackData.info?.duration || 0,
            isStream: !!trackData.info?.isStream,
            position: trackData.info?.position || 0,
            title: trackData.info?.title || 'Unknown',
            uri: trackData.info?.uri,
            artworkUrl: trackData.info?.artworkUrl,
            isrc: trackData.info?.isrc,
            sourceName: trackData.info?.sourceName || 'unknown'
          },
          pluginInfo: trackData.pluginInfo || {},
          userData: trackData.userData || {}
        }];
      } else if (data.loadType === 'search' && Array.isArray(data.data)) {
        // Search results: data is an array of tracks
        tracks = data.data.map(t => ({
          encoded: t.encoded,
          info: {
            identifier: t.info?.identifier,
            isSeekable: t.info?.isSeekable !== false,
            author: t.info?.author || 'Unknown',
            length: t.info?.length || t.info?.duration || 0,
            isStream: !!t.info?.isStream,
            position: t.info?.position || 0,
            title: t.info?.title || 'Unknown',
            uri: t.info?.uri,
            artworkUrl: t.info?.artworkUrl,
            isrc: t.info?.isrc,
            sourceName: t.info?.sourceName || 'unknown'
          },
          pluginInfo: t.pluginInfo || {},
          userData: t.userData || {}
        }));
      } else if (data.loadType === 'playlist' && data.data?.tracks) {
        // Playlist: tracks array inside data
        tracks = data.data.tracks.map(t => ({
          encoded: t.encoded,
          info: {
            identifier: t.info?.identifier,
            isSeekable: t.info?.isSeekable !== false,
            author: t.info?.author || 'Unknown',
            length: t.info?.length || t.info?.duration || 0,
            isStream: !!t.info?.isStream,
            position: t.info?.position || 0,
            title: t.info?.title || 'Unknown',
            uri: t.info?.uri,
            artworkUrl: t.info?.artworkUrl,
            isrc: t.info?.isrc,
            sourceName: t.info?.sourceName || 'unknown'
          },
          pluginInfo: t.pluginInfo || {},
          userData: t.userData || {}
        }));
        playlist = data.data.info || null;
      }
      
      logger.info(`Lavalink REST response loadType: ${data.loadType || '<unknown>'}, tracks parsed: ${tracks.length}, playlistInfo: ${playlist ? JSON.stringify(playlist) : 'none'}`);
      
      // If Lavalink reports an error or returned no tracks, log the full payload for diagnostics
      if (data.loadType === 'error' || tracks.length === 0) {
        try {
          logger.warn(`Lavalink REST full response: ${JSON.stringify(data)}`);
        } catch {
          logger.warn('Lavalink REST full response (failed to stringify)');
        }
      }

      return { tracks, playlist };
    } catch (err) {
      logger.error(`Error calling Lavalink REST ${url}:`, err.message);
      // try next path
      continue;
    }
  }

  return { tracks: [], playlist: null };
}

/**
 * Search using play-dl
 */
async function searchWithPlayDl(query) {
  try {
    // Check if it's a URL
    const validateResult = await play.validate(query);
    logger.info(`play-dl validate result for "${query}": ${validateResult}`);
    
    // Handle SoundCloud URLs (requires setup)
    if (validateResult && validateResult.includes('so_')) {
      throw new Error('SoundCloud playback requires API setup. Please use YouTube URLs or search terms instead.');
    }
    
    if (validateResult !== false && validateResult !== 'search') {
      // Handle playlists
      if (validateResult === 'yt_playlist') {
        // play-dl has issues with playlists, use yt-dlp instead
        logger.info(`Detected YouTube playlist, using yt-dlp for extraction`);
        try {
          const playlistTracks = await extractPlaylistWithYtDlp(query);
          if (playlistTracks && playlistTracks.length > 0) {
            logger.info(`✓ Extracted ${playlistTracks.length} tracks from playlist via yt-dlp`);
            return playlistTracks;
          }
        } catch (ytDlpError) {
          logger.error('yt-dlp playlist extraction failed:', ytDlpError.message);
        }
        
        // Fallback: try play-dl with cleaned URL
        try {
          // Clean the URL - remove tracking parameters that can cause issues
          let cleanUrl = query;
          try {
            const url = new globalThis.URL(query);
            // Keep only the essential playlist parameter
            const playlistId = url.searchParams.get('list');
            if (playlistId) {
              cleanUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
              logger.info(`Trying play-dl with cleaned URL: ${cleanUrl}`);
            }
          } catch (urlError) {
            logger.warn('Failed to clean URL, using original:', urlError.message);
          }

          logger.info(`Fetching playlist info for: ${cleanUrl}`);
          const playlistInfo = await play.playlist_info(cleanUrl, { incomplete: true });
          logger.info(`Playlist info retrieved:`, {
            title: playlistInfo.title,
            videoCount: playlistInfo.videoCount
          });
          const videos = await playlistInfo.all_videos();
          logger.info(`Found ${videos.length} videos in playlist via play-dl`);
          return videos.map(convertPlayDlToTrack);
        } catch (playlistError) {
          logger.error('play-dl also failed:', playlistError.message);
          throw new Error('Failed to load playlist. Please try a different playlist or individual songs.');
        }
      }
      
      // Handle single videos
      if (validateResult === 'yt_video') {
        const info = await play.video_info(query);
        return [convertPlayDlToTrack(info.video_details)];
      }
      
      // Handle other URL types (Spotify, SoundCloud, etc.)
      logger.warn(`Unsupported URL type: ${validateResult}, trying as search`);
    }

    // Search YouTube (for plain text queries or unsupported URLs)
    logger.debug(`Searching YouTube for: ${query}`);
    const results = await play.search(query, { limit: 10, source: { youtube: 'video' } });
    
    if (results && results.length > 0) {
      logger.info(`Found ${results.length} results via YouTube search`);
      logger.debug(`First result sample:`, JSON.stringify(results[0], null, 2));
      return results.map(convertPlayDlToTrack);
    }
    
    return [];

  } catch (error) {
    logger.error('play-dl search error:', error);
    return [];
  }
}

/**
 * Convert play-dl track format to Lavalink-compatible format
 */
function convertPlayDlToTrack(video) {
  // play-dl search results have: url, id, title, channel, durationInSec, thumbnails, etc.
  const url = video.url || (video.id ? `https://www.youtube.com/watch?v=${video.id}` : null);
  const duration = video.durationInSec 
    ? video.durationInSec * 1000 
    : (video.durationRaw ? parseDuration(video.durationRaw) : 0);
  
  return {
    title: video.title,
    author: video.channel?.name || video.channel || 'Unknown',
    duration: duration,
    uri: url,
    url: url, // play-dl.stream() needs this
    thumbnail: video.thumbnails?.[0]?.url || video.thumbnail?.url,
    artworkUrl: video.thumbnails?.[0]?.url || video.thumbnail?.url,
    sourceName: 'youtube',
    isPlayDl: true,
    raw: video
  };
}

/**
 * Parse duration string (e.g., "3:45" or "1:23:45") to milliseconds
 */
function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    // MM:SS
    return (parts[0] * 60 + parts[1]) * 1000;
  } else if (parts.length === 3) {
    // HH:MM:SS
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return 0;
}

/**
 * Determine search source based on query
 */
function determineSource(query) {
  if (query.includes('spotify.com')) return 'spotify';
  if (query.includes('soundcloud.com')) return 'soundcloud';
  if (query.includes('deezer.com')) return 'deezer';
  
  // For URLs, let Lavalink auto-detect
  if (query.includes('youtube.com') || query.includes('youtu.be')) {
    return undefined; // Let Lavalink handle URL detection
  }
  
  // Default to YouTube Music for search queries
  return 'ytmsearch';
}

/**
 * Validate and extract URL
 */
export function isValidUrl(string) {
  try {
    const url = new globalThis.URL(string);
    return !!url;
  } catch {
    return false;
  }
}

/**
 * Extract playlist videos using yt-dlp
 * @param {string} playlistUrl - YouTube playlist URL
 * @returns {Promise<Array>} Array of track objects
 */
async function extractPlaylistWithYtDlp(playlistUrl) {
  return new Promise((resolve, reject) => {
    // Use yt-dlp with anti-throttling options for playlist extraction
    const ytdlp = spawn('yt-dlp', [
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--playlist-end', '200', // Limit to first 200 videos
      '--extractor-args', 'youtube:player_client=android,web',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      playlistUrl
    ]);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        logger.error('yt-dlp playlist extraction failed:', stderr);
        return reject(new Error(`yt-dlp failed with code ${code}`));
      }

      try {
        // Parse JSON lines
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        const tracks = lines.map(line => {
          const data = JSON.parse(line);
          const videoId = data.id || data.url;
          return {
            title: data.title || 'Unknown Title',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            uri: `https://www.youtube.com/watch?v=${videoId}`,
            duration: (data.duration || 0) * 1000, // Convert to milliseconds
            author: data.uploader || 'Unknown',
            thumbnail: data.thumbnail || null,
            artworkUrl: data.thumbnail || null,
            isStream: false,
            isSeekable: true,
            sourceName: 'youtube'
          };
        });

        logger.info(`✓ Parsed ${tracks.length} tracks from yt-dlp output`);
        resolve(tracks);
      } catch (parseError) {
        logger.error('Failed to parse yt-dlp output:', parseError.message);
        reject(parseError);
      }
    });

    ytdlp.on('error', (error) => {
      logger.error('Failed to spawn yt-dlp:', error.message);
      reject(error);
    });
  });
}
