import { loadCommands, registerCommands } from './core/registry.js';
import logger from './utils/logger.js';

/**
 * Deploy slash commands to Discord
 * Usage: 
 *   node src/deploy-commands.js --scope=guild (deploy to test guild)
 *   node src/deploy-commands.js --scope=global (deploy globally)
 */

async function deploy() {
  try {
    // Get scope from command line arguments
    const args = process.argv.slice(2);
    const scopeArg = args.find(arg => arg.startsWith('--scope='));
    const scope = scopeArg ? scopeArg.split('=')[1] : 'guild';

    if (!['guild', 'global'].includes(scope)) {
      logger.error('Invalid scope. Use --scope=guild or --scope=global');
      process.exit(1);
    }

    logger.info(`Deploying commands with scope: ${scope}`);

    // Load commands
    const commands = await loadCommands();

    // Register with Discord
    await registerCommands(commands, scope);

    logger.info('✅ Successfully deployed commands!');
    process.exit(0);

  } catch (error) {
    logger.error('Failed to deploy commands:', error);
    process.exit(1);
  }
}

deploy();
