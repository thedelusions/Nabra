import { LavalinkManager } from 'lavalink-client';
import { config } from '../utils/config.js';
import logger from '../utils/logger.js';

let manager = null;
let client = null;

/**
 * Initialize Lavalink Manager
 * @param {Client} discordClient - Discord.js client instance
 * @returns {LavalinkManager}
 */
export function initLavalink(discordClient) {
  client = discordClient;

  logger.info('Initializing Lavalink Manager...');

  manager = new LavalinkManager({
    nodes: config.lavalink.nodes,
    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        guild.shard.send(payload);
      }
    },
    client: {
      id: config.clientId,
    },
    autoSkip: true,
    playerOptions: {
      clientBasedPositionUpdateInterval: 250,
      defaultSearchPlatform: 'ytmsearch',
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false
      },
      onEmptyQueue: {
        destroyAfterMs: 30_000,
      },
      useUnresolvedData: true
    },
    queueOptions: {
      maxPreviousTracks: 25
    },
    advancedOptions: {
      maxRetryAttempts: 5,
      retryAttemptsInterval: 3000,
      enablePingOnStatsCheck: true
    }
  });

  setupEventListeners();

  // Initialize Lavalink
  manager.init({ 
    id: client.user.id, 
    username: client.user.username 
  });

  logger.info('Lavalink Manager initialized');
  
  // Force connection check after initialization
  setTimeout(() => {
    const nodes = Array.from(manager.nodeManager.nodes.values());
    if (nodes.length === 0) {
      logger.warn('⚠️ No Lavalink nodes configured!');
    } else {
      nodes.forEach(node => {
        logger.info(`📡 Lavalink Node: ${node.options.id} - Connected: ${node.connected}`);
        if (!node.connected) {
          logger.warn(`Attempting to reconnect node: ${node.options.id}`);
        }
      });
    }
  }, 2000);

  return manager;
}

/**
 * Setup Lavalink event listeners
 */
function setupEventListeners() {
  // Node events
  manager.on('nodeConnect', (node) => {
    logger.info(`✅ Lavalink Node connected: ${node.options.id}`);
  });

  manager.on('nodeDisconnect', (node, reason) => {
    logger.warn(`⚠️ Lavalink Node disconnected: ${node.options.id}`, { reason });
  });

  manager.on('nodeError', (node, error) => {
    logger.error(`❌ Lavalink Node error: ${node.options.id}`, error);
  });

  manager.on('nodeReconnect', (node) => {
    logger.info(`🔄 Lavalink Node reconnecting: ${node.options.id}`);
  });

  // Track events
  manager.on('trackStart', async (player, track) => {
    logger.info(`▶️ Track started in guild ${player.guildId}: ${track.info.title}`);
    
    // Clear inactivity timer when track starts
    const playerManagerModule = await import('./player.js');
    const playerManager = playerManagerModule.default;
    playerManager.clearInactivityTimer(player.guildId);
    
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) {
      const { createNowPlayingEmbed } = await import('../utils/embeds.js');
      const requestedBy = client.users.cache.get(track.requester?.id) || 'Unknown';
      
      channel.send({
        embeds: [createNowPlayingEmbed({
          title: track.info.title,
          author: track.info.author,
          duration: track.info.duration,
          uri: track.info.uri,
          thumbnail: track.info.artworkUrl,
          sourceName: track.info.sourceName
        }, requestedBy)]
      }).catch(err => logger.error('Failed to send now playing message:', err));
    }
  });

  manager.on('trackEnd', (player, track) => {
    logger.debug(`Track ended in guild ${player.guildId}: ${track.info.title}`);
  });

  manager.on('trackStuck', (player, track, payload) => {
    logger.warn(`Track stuck in guild ${player.guildId}: ${track.info.title}`, payload);
  });

  manager.on('trackError', (player, track, payload) => {
    logger.error(`Track error in guild ${player.guildId}: ${track.info.title}`, payload);
  });

  manager.on('queueEnd', async (player) => {
    logger.info(`Queue ended in guild ${player.guildId}`);
    
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) {
      const { createEmbed } = await import('../utils/embeds.js');
      channel.send({
        embeds: [createEmbed('🎵 Queue Ended', 'The queue has finished playing.')]
      }).catch(err => logger.error('Failed to send queue end message:', err));
    }

    // Start inactivity timer when queue ends
    const playerManagerModule = await import('./player.js');
    const playerManager = playerManagerModule.default;
    playerManager.startInactivityTimer(player.guildId);
  });

  manager.on('playerDisconnect', (player) => {
    logger.info(`Player disconnected in guild ${player.guildId}`);
  });

  manager.on('playerMove', (player, oldVoiceChannelId, newVoiceChannelId) => {
    logger.info(`Player moved in guild ${player.guildId} from ${oldVoiceChannelId} to ${newVoiceChannelId}`);
    player.voice.channelId = newVoiceChannelId;
  });
}

/**
 * Get Lavalink Manager instance
 */
export function getManager() {
  if (!manager) {
    throw new Error('Lavalink Manager not initialized. Call initLavalink first.');
  }
  return manager;
}

/**
 * Update voice state for Lavalink
 */
export function updateVoiceState(data) {
  if (manager) {
    manager.sendRawData(data);
  }
}

/**
 * Check if Lavalink is available
 */
export function isLavalinkAvailable() {
  return manager && manager.nodeManager && manager.nodeManager.nodes && 
         manager.nodeManager.nodes.size > 0 && 
         Array.from(manager.nodeManager.nodes.values()).some(n => n.connected);
}

export { manager };
