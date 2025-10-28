import { Events } from 'discord.js';
import { initLavalink } from '../core/lavalinkClient.js';
import logger from '../utils/logger.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`✅ Logged in as ${client.user.tag}`);
    logger.info(`📊 Serving ${client.guilds.cache.size} guild(s)`);

    // Set bot presence
    client.user.setPresence({
      activities: [{ name: '/help for commands', type: 2 }], // Type 2 = LISTENING
      status: 'online'
    });

    // Initialize Lavalink
    try {
      initLavalink(client);
      logger.info('🎵 Lavalink initialization started');
    } catch (error) {
      logger.error('Failed to initialize Lavalink:', error);
      logger.warn('⚠️ Bot will use play-dl fallback only');
    }

    logger.info('🚀 Nabra Music Bot is ready!');
  }
};
