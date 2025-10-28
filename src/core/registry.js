import { REST, Routes } from 'discord.js';
import { config } from '../utils/config.js';
import logger from '../utils/logger.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all command files
 */
export async function loadCommands() {
  const commands = new Map();
  const commandsPath = join(__dirname, '../commands');

  async function loadFromDir(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await loadFromDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        try {
          const command = await import(`file://${fullPath}`);
          if (command.default?.data && command.default?.execute) {
            commands.set(command.default.data.name, command.default);
            logger.debug(`Loaded command: ${command.default.data.name}`);
          }
        } catch (error) {
          logger.error(`Failed to load command from ${fullPath}:`, error);
        }
      }
    }
  }

  await loadFromDir(commandsPath);
  logger.info(`Loaded ${commands.size} commands`);
  
  return commands;
}

/**
 * Register slash commands with Discord
 */
export async function registerCommands(commands, scope = 'guild') {
  const rest = new REST({ version: '10' }).setToken(config.token);
  
  const commandData = Array.from(commands.values()).map(cmd => cmd.data.toJSON());

  try {
    logger.info(`Started refreshing ${commandData.length} application (/) commands (${scope})...`);

    let data;
    if (scope === 'global') {
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commandData }
      );
    } else {
      if (!config.guildId) {
        throw new Error('GUILD_ID is required for guild command registration');
      }
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commandData }
      );
    }

    logger.info(`Successfully reloaded ${data.length} application (/) commands (${scope})`);
    return data;
  } catch (error) {
    logger.error('Failed to register commands:', error);
    throw error;
  }
}
