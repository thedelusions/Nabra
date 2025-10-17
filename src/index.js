import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
});

client.commands = new Collection();

const commandFolders = fs.readdirSync('./src/commands');
for (const folder of commandFolders) {
  const files = fs.readdirSync(`./src/commands/${folder}`).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const command = await import(`./commands/${folder}/${file}`);
    client.commands.set(command.data.name, command);
  }
}

const eventFiles = fs.readdirSync('./src/events').filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = await import(`./events/${file}`);
  const eventName = file.split('.')[0];
  client.on(eventName, (...args) => event.default(client, ...args));
}

client.login(process.env.TOKEN);
