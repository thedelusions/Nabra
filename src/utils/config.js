import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig();

// Load config.json
const configPath = join(__dirname, '../../config.json');
const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

// Environment validation schema
const envSchema = z.object({
  TOKEN: z.string().min(1, 'Discord token is required'),
  CLIENT_ID: z.string().min(1, 'Client ID is required'),
  GUILD_ID: z.string().optional(),
  LAVALINK_HOST: z.string().default('localhost'),
  LAVALINK_PORT: z.string().default('2333'),
  LAVALINK_PASSWORD: z.string().default('youshallnotpass'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

// Validate environment variables
let env;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

// Parse Lavalink nodes
function parseLavalinkNodes() {
  const nodes = [];
  
  // Check for multiple nodes configuration
  if (env.LAVALINK_NODES) {
    const nodeConfigs = env.LAVALINK_NODES.split(',');
    nodeConfigs.forEach((nodeConfig, index) => {
      const [id, host, port, password] = nodeConfig.split(':');
      nodes.push({
        id: id || `Node${index + 1}`,
        host: host || 'localhost',
        port: parseInt(port) || 2333,
        authorization: password || 'youshallnotpass',
        secure: false
      });
    });
  } else {
    // Single node configuration
    nodes.push({
      id: 'MainNode',
      host: env.LAVALINK_HOST,
      port: parseInt(env.LAVALINK_PORT),
      authorization: env.LAVALINK_PASSWORD,
      secure: false
    });
  }
  
  return nodes;
}

export const config = {
  // Discord
  token: env.TOKEN,
  clientId: env.CLIENT_ID,
  guildId: env.GUILD_ID,
  
  // Lavalink
  lavalink: {
    nodes: parseLavalinkNodes()
  },
  
  // Logging
  logging: {
    level: env.LOG_LEVEL
  },
  
  // From config.json
  ...rawConfig
};

export default config;
