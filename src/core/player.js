import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  demuxProbe
} from '@discordjs/voice';
import { getManager, isLavalinkAvailable } from './lavalinkClient.js';
import { unifiedSearch } from '../utils/search.js';
import logger from '../utils/logger.js';
import queueManager from './queueManager.js';
import { spawn } from 'child_process';

/**
 * Unified Player Interface
 * Handles both Lavalink and play-dl playback
 */
class PlayerManager {
  constructor() {
    this.playDlPlayers = new Map(); // Fallback play-dl players
    this.inactivityTimers = new Map(); // Timers for auto-disconnect
    this.INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Play a track
   */
  async play(interaction, query) {
    const { guild, member, channel } = interaction;

    // Check voice channel
    if (!member.voice.channel) {
      throw new Error('You need to be in a voice channel!');
    }

    // Search for track
    const manager = getManager();
    const searchResults = await unifiedSearch(manager, query, interaction.user);

    if (!searchResults.tracks || searchResults.tracks.length === 0) {
      throw new Error('No results found!');
    }

    // Check if it's a playlist
    const isPlaylist = searchResults.tracks.length > 1;
    
    if (isPlaylist) {
      // Handle playlist - add all tracks
      logger.info(`Adding playlist with ${searchResults.tracks.length} tracks`);
      
      // Try Lavalink first
      if (isLavalinkAvailable() && searchResults.source === 'lavalink') {
        return this.playPlaylistWithLavalink(guild.id, member.voice.channel, channel, searchResults.tracks, interaction.user);
      }
      
      // Fallback to play-dl
      return this.playPlaylistWithPlayDl(guild.id, member.voice.channel, channel, searchResults.tracks, interaction.user);
    }

    // Single track
    const track = searchResults.tracks[0];

    // Try Lavalink first
    if (isLavalinkAvailable() && searchResults.source === 'lavalink') {
      return this.playWithLavalink(guild.id, member.voice.channel, channel, track, interaction.user);
    }

    // Fallback to play-dl
    return this.playWithPlayDl(guild.id, member.voice.channel, channel, track, interaction.user);
  }

  /**
   * Play with Lavalink
   */
  async playWithLavalink(guildId, voiceChannel, textChannel, track, user) {
    const manager = getManager();
    
    let player = manager.getPlayer(guildId);

    if (!player) {
      player = manager.createPlayer({
        guildId: guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: textChannel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 100
      });
    }

    // Add requester info
    track.requester = user;

    // Connect if not connected
    if (!player.connected) {
      await player.connect();
    }

    // Add to queue
    player.queue.add(track);
    queueManager.addToHistory(guildId, track);

    // Start playing if not already playing
    if (!player.playing && !player.paused) {
      await player.play();
    }

    return {
      success: true,
      track,
      queuePosition: player.queue.tracks.length
    };
  }

  /**
   * Play playlist with Lavalink
   */
  async playPlaylistWithLavalink(guildId, voiceChannel, textChannel, tracks, user) {
    const manager = getManager();
    
    let player = manager.getPlayer(guildId);

    if (!player) {
      player = manager.createPlayer({
        guildId: guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: textChannel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 100
      });
    }

    // Add requester info to all tracks
    tracks.forEach(track => {
      track.requester = user;
    });

    // Connect if not connected
    if (!player.connected) {
      await player.connect();
    }

    // Add all tracks to queue
    tracks.forEach(track => {
      player.queue.add(track);
      queueManager.addToHistory(guildId, track);
    });

    // Start playing if not already playing
    if (!player.playing && !player.paused) {
      await player.play();
    }

    return {
      success: true,
      track: tracks[0],
      queuePosition: 0,
      playlistSize: tracks.length
    };
  }

  /**
   * Play with play-dl (fallback)
   */
  async playWithPlayDl(guildId, voiceChannel, textChannel, track, user) {
    logger.info(`Using play-dl fallback for guild ${guildId}`);

    let playerData = this.playDlPlayers.get(guildId);

    if (!playerData) {
      logger.debug(`Creating voice connection for guild ${guildId} in channel ${voiceChannel.name}`);
      
      // Create voice connection
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });

      // Create audio player
      const audioPlayer = createAudioPlayer();

      // Subscribe connection to player
      connection.subscribe(audioPlayer);
      
      // Handle connection errors
      connection.on('error', (error) => {
        logger.error(`Voice connection error in guild ${guildId}:`, error);
      });

      playerData = {
        connection,
        audioPlayer,
        queue: [],
        currentTrack: null,
        textChannel
      };

      this.playDlPlayers.set(guildId, playerData);

      // Handle player events
      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        this.playNextPlayDl(guildId);
      });

      audioPlayer.on('error', error => {
        console.error('Audio player error:', error);
        logger.error(`play-dl player error in guild ${guildId}:`, error);
        this.playNextPlayDl(guildId);
      });
    }

    // Add track to queue
    track.requester = user;
    playerData.queue.push(track);

    // Start playing if idle
    if (playerData.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      await this.playNextPlayDl(guildId);
    }

    return {
      success: true,
      track,
      queuePosition: playerData.queue.length
    };
  }

  /**
   * Play playlist with play-dl (fallback)
   */
  async playPlaylistWithPlayDl(guildId, voiceChannel, textChannel, tracks, user) {
    logger.info(`Using play-dl fallback for playlist in guild ${guildId} (${tracks.length} tracks)`);

    let playerData = this.playDlPlayers.get(guildId);

    if (!playerData) {
      logger.debug(`Creating voice connection for guild ${guildId} in channel ${voiceChannel.name}`);
      
      // Create voice connection
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });

      // Create audio player
      const audioPlayer = createAudioPlayer();

      // Subscribe connection to player
      connection.subscribe(audioPlayer);
      
      // Handle connection errors
      connection.on('error', (error) => {
        logger.error(`Voice connection error in guild ${guildId}:`, error);
      });

      playerData = {
        connection,
        audioPlayer,
        queue: [],
        currentTrack: null,
        textChannel
      };

      this.playDlPlayers.set(guildId, playerData);

      // Handle player events
      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        this.playNextPlayDl(guildId);
      });

      audioPlayer.on('error', error => {
        console.error('Audio player error:', error);
        logger.error(`play-dl player error in guild ${guildId}:`, error);
        this.playNextPlayDl(guildId);
      });
    }

    // Add all tracks to queue
    tracks.forEach(track => {
      track.requester = user;
      playerData.queue.push(track);
    });

    // Start playing if idle
    if (playerData.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      await this.playNextPlayDl(guildId);
    }

    return {
      success: true,
      track: tracks[0],
      queuePosition: 0,
      playlistSize: tracks.length
    };
  }

  /**
   * Play next track with play-dl
   */
  async playNextPlayDl(guildId) {
    const playerData = this.playDlPlayers.get(guildId);
    if (!playerData) {
      logger.warn(`No player data found for guild ${guildId}`);
      return;
    }
    
    if (playerData.queue.length === 0) {
      // No more tracks, start inactivity timer
      logger.info(`Queue empty for guild ${guildId}, starting inactivity timer`);
      this.startInactivityTimer(guildId);
      return;
    }

    // Clear inactivity timer when playing
    this.clearInactivityTimer(guildId);

    const track = playerData.queue.shift();
    logger.info(`Playing next track: ${track.title} (${playerData.queue.length} remaining in queue)`);
    
    // Prevent duplicate "Now Playing" messages for the same track
    if (playerData.currentTrack?.uri === track.uri) {
      logger.warn('Skipping duplicate track');
      return;
    }
    
    playerData.currentTrack = track;

    try {
      logger.debug(`Streaming from: ${track.uri || track.url}`);
      
      let videoUrl = track.uri || track.url;
      
      if (!videoUrl && track.raw?.id) {
        videoUrl = `https://www.youtube.com/watch?v=${track.raw.id}`;
      }
      
      if (!videoUrl) {
        throw new Error('No valid URL found for track');
      }
      
      try {
        // Spawn yt-dlp process with anti-throttling and streaming options
        const ytdlpProcess = spawn('yt-dlp', [
          '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
          '-o', '-',
          '--no-warnings',
          '--no-playlist',
          '--extractor-args', 'youtube:player_client=android,web',
          '--no-part',
          '--quiet',
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '--no-check-certificate',
          videoUrl
        ], {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        // Handle spawn errors immediately
        ytdlpProcess.on('error', (error) => {
          if (error.code === 'ENOENT') {
            logger.error('❌ yt-dlp not found. Please install yt-dlp or use Lavalink for YouTube playback.');
          } else {
            logger.error('❌ yt-dlp process error:', error);
          }
          // Skip to next track instead of crashing
          this.playNextPlayDl(guildId).catch(err => 
            logger.error('Failed to skip to next track:', err)
          );
          return;
        });

        if (!ytdlpProcess.stdout) {
          throw new Error('No stdout from yt-dlp');
        }

        const stream = ytdlpProcess.stdout;
        
        // Capture stderr for debugging
        let stderrOutput = '';
        if (ytdlpProcess.stderr) {
          ytdlpProcess.stderr.on('data', (chunk) => {
            stderrOutput += chunk.toString();
          });
          
          ytdlpProcess.stderr.on('end', () => {
            if (stderrOutput) {
              console.error('yt-dlp stderr:', stderrOutput);
            }
          });
        }
        
        stream.on('end', () => {
          logger.debug(`Stream ended for guild ${guildId}`);
        });
        
        const onError = (error) => {
          if (!ytdlpProcess.killed) ytdlpProcess.kill();
          stream.resume();
          logger.error('Stream error:', error);
        };
        
        ytdlpProcess.on('exit', (code, signal) => {
          console.log(`yt-dlp process exited with code ${code}, signal ${signal}`);
          if (code !== 0 && code !== null) {
            console.error(`yt-dlp failed with exit code ${code}`);
          }
        });

        // Use demuxProbe to detect the stream type
        ytdlpProcess
          .once('spawn', () => {
            demuxProbe(stream)
              .then((probe) => {
                const resource = createAudioResource(probe.stream, {
                  metadata: track,
                  inputType: probe.type,
                  inlineVolume: true
                });
                
                // Add error handler for the resource
                resource.playStream.on('error', (error) => {
                  logger.error('Playback stream error:', error);
                });

                playerData.audioPlayer.play(resource);
              })
              .catch(onError);
          });
          
      } catch (streamError) {
        logger.error(`Streaming failed for guild ${guildId}:`, streamError.message);
        throw streamError;
      }
      queueManager.addToHistory(guildId, track);

      logger.info(`Playing with play-dl in guild ${guildId}: ${track.title}`);

      // Send now playing message
      if (playerData.textChannel) {
        const { createNowPlayingEmbed } = await import('../utils/embeds.js');
        playerData.textChannel.send({
          embeds: [createNowPlayingEmbed(track, track.requester)]
        }).catch(err => logger.error('Failed to send now playing message:', err));
      }
    } catch (error) {
      logger.error(`Failed to play track with play-dl in guild ${guildId}:`, error);
      await this.playNextPlayDl(guildId);
    }
  }

  /**
   * Get player for guild
   */
  getPlayer(guildId) {
    // First check if we have a play-dl player
    const playerData = this.playDlPlayers.get(guildId);
    
    // Try Lavalink only if available and no play-dl player exists
    if (isLavalinkAvailable() && !playerData) {
      const manager = getManager();
      const lavalinkPlayer = manager.getPlayer(guildId);
      if (lavalinkPlayer) {
        return lavalinkPlayer;
      }
    }
    
    // Return play-dl player with unified interface
    if (!playerData) return null;
    
    return {
      guildId,
      queue: { 
        tracks: playerData.queue,
        current: playerData.currentTrack
      },
      playing: playerData.audioPlayer.state.status === AudioPlayerStatus.Playing,
      paused: playerData.audioPlayer.state.status === AudioPlayerStatus.Paused,
      current: playerData.currentTrack,
      // Add methods for compatibility
      pause: () => {
        playerData.audioPlayer.pause();
        return true;
      },
      resume: () => {
        playerData.audioPlayer.unpause();
        return true;
      },
      stop: () => {
        playerData.queue = [];
        playerData.audioPlayer.stop();
        return true;
      },
      skip: () => {
        playerData.audioPlayer.stop(); // This will trigger the next track
        return true;
      },
      clear: () => {
        playerData.queue = [];
        return true;
      },
      // Flag to identify play-dl player
      isPlayDl: true
    };
  }

  /**
   * Check if a player exists for the guild
   */
  hasPlayer(guildId) {
    // Check play-dl player first
    if (this.playDlPlayers.has(guildId)) {
      return true;
    }
    
    // Check Lavalink player
    if (isLavalinkAvailable()) {
      const manager = getManager();
      return manager.getPlayer(guildId) !== null;
    }
    
    return false;
  }

  /**
   * Destroy player
   */
  destroy(guildId) {
    // Destroy Lavalink player
    if (isLavalinkAvailable()) {
      const manager = getManager();
      const player = manager.getPlayer(guildId);
      if (player) {
        player.destroy();
      }
    }

    // Destroy play-dl player
    const playerData = this.playDlPlayers.get(guildId);
    if (playerData) {
      playerData.audioPlayer.stop();
      playerData.connection.destroy();
      this.playDlPlayers.delete(guildId);
    }

    // Clear inactivity timer
    this.clearInactivityTimer(guildId);

    queueManager.clear(guildId);
  }

  /**
   * Start inactivity timer for auto-disconnect
   */
  startInactivityTimer(guildId) {
    // Clear existing timer
    this.clearInactivityTimer(guildId);

    // Set new timer
    const timer = setTimeout(() => {
      logger.info(`⏱️ Inactivity timeout reached for guild ${guildId}, disconnecting...`);
      this.destroy(guildId);
    }, this.INACTIVITY_TIMEOUT);

    this.inactivityTimers.set(guildId, timer);
    logger.debug(`Started inactivity timer for guild ${guildId} (5 minutes)`);
  }

  /**
   * Clear inactivity timer
   */
  clearInactivityTimer(guildId) {
    const timer = this.inactivityTimers.get(guildId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimers.delete(guildId);
      logger.debug(`Cleared inactivity timer for guild ${guildId}`);
    }
  }

  /**
   * Check if bot is alone in voice channel
   */
  checkVoiceChannelMembers(guildId, voiceChannel) {
    // Count non-bot members
    const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot).size;
    
    if (nonBotMembers === 0) {
      logger.info(`👥 All users left voice channel in guild ${guildId}, disconnecting...`);
      this.destroy(guildId);
      return true;
    }
    
    return false;
  }
}

// Singleton instance
const playerManager = new PlayerManager();

export default playerManager;
