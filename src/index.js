import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './utils/config.js';
import logger from './utils/logger.js';
import { loadCommands } from './core/registry.js';
import { updateVoiceState } from './core/lavalinkClient.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize commands collection
client.commands = new Collection();

/**
 * Load event handlers
 */
async function loadEvents() {
  const eventsPath = join(__dirname, 'events');
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const event = await import(`file://${filePath}`);
    
    if (event.default.once) {
      client.once(event.default.name, (...args) => event.default.execute(...args));
    } else {
      client.on(event.default.name, (...args) => event.default.execute(...args));
    }
    
    logger.debug(`Loaded event: ${event.default.name}`);
  }
  
  logger.info(`Loaded ${eventFiles.length} event handlers`);
}

/**
 * Setup voice state updates for Lavalink
 */
function setupVoiceStateUpdates() {
  client.on('raw', (data) => {
    if (!['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(data.t)) return;
    
    try {
      updateVoiceState(data);
    } catch (error) {
      logger.error('Error updating voice state:', error);
    }
  });
}

/**
 * Initialize the bot
 */
async function init() {
  try {
    logger.info('🚀 Starting Nabra Music Bot...');

    // Load commands
    const commands = await loadCommands();
    client.commands = commands;

    // Load events
    await loadEvents();

    // Setup voice state updates
    setupVoiceStateUpdates();

    // Handle process termination
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Login to Discord
    await client.login(config.token);

  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  logger.info(`\n${signal} received, shutting down gracefully...`);
  
  try {
    // Destroy all players
    const { getManager, isLavalinkAvailable } = await import('./core/lavalinkClient.js');
    
    if (isLavalinkAvailable()) {
      const manager = getManager();
      manager.players.forEach(player => player.destroy());
      logger.info('Destroyed all Lavalink players');
    }

    // Destroy client
    client.destroy();
    logger.info('Client destroyed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the bot
init();
