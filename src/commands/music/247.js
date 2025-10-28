import { SlashCommandBuilder } from 'discord.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createEmbed } from '../../utils/embeds.js';
import { COLORS, EMOJIS } from '../../utils/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = join(__dirname, '../../../data/247-settings.json');

function loadSettings() {
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export default {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 mode (bot stays in voice channel even when queue ends)'),

  async execute(interaction) {
    // Check if user has permissions
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({
        embeds: [createEmbed(
          'Permission Denied',
          'You need **Manage Server** permission to use this command!',
          COLORS.ERROR
        )],
        ephemeral: true
      });
    }

    const settings = loadSettings();
    const guildId = interaction.guild.id;
    const current247 = settings[guildId] || false;
    
    // Toggle the setting
    settings[guildId] = !current247;
    saveSettings(settings);

    const newStatus = settings[guildId];

    return interaction.reply({
      embeds: [createEmbed(
        `${newStatus ? '🔄' : '⏹️'} 24/7 Mode ${newStatus ? 'Enabled' : 'Disabled'}`,
        newStatus 
          ? 'Bot will now stay in the voice channel even when the queue ends.'
          : 'Bot will now disconnect when the queue ends.',
        COLORS.SUCCESS
      )]
    });
  }
};

// Export helper function to check 24/7 status
export function is247Enabled(guildId) {
  const settings = loadSettings();
  return settings[guildId] || false;
}
