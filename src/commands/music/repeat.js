import { SlashCommandBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import queueManager from '../../core/queueManager.js';
import { REPEAT_MODES, EMOJIS } from '../../utils/constants.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('repeat')
    .setDescription('Set repeat mode')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Repeat mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.member.voice.channel) {
        return interaction.reply({
          embeds: [createErrorEmbed('You need to be in a voice channel!')],
          flags: [64]
        });
      }

      const player = playerManager.getPlayer(interaction.guild.id);

      if (!player) {
        // Check if there's a queue even without active player
        const queueExists = queueManager.getQueue(interaction.guild.id);
        if (!queueExists || queueExists.length === 0) {
          return interaction.reply({
            embeds: [createErrorEmbed('No active player or queue in this server!')],
            flags: [64]
          });
        }
        // If queue exists but no player, still allow setting repeat mode
      }

      const mode = interaction.options.getString('mode');
      let repeatMode;

      switch (mode) {
        case 'track':
          repeatMode = REPEAT_MODES.TRACK;
          break;
        case 'queue':
          repeatMode = REPEAT_MODES.QUEUE;
          break;
        default:
          repeatMode = REPEAT_MODES.OFF;
      }

      // Set repeat mode in queue manager
      queueManager.setRepeatMode(interaction.guild.id, repeatMode);

      // Set Lavalink player repeat mode if available
      if (player && !player.isPlayDl && player.setRepeatMode) {
        const lavalinkMode = mode === 'track' ? 'track' : mode === 'queue' ? 'queue' : 'off';
        player.setRepeatMode(lavalinkMode);
      }

      const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
      logger.info(`Set repeat mode to ${modeName} in guild ${interaction.guild.id}`);

      const emoji = mode === 'track' ? '🔂' : mode === 'queue' ? '🔁' : '▶️';
      const description = mode === 'track' 
        ? 'Current track will repeat continuously' 
        : mode === 'queue' 
        ? 'Queue will repeat when it ends' 
        : 'Repeat is now disabled';

      return interaction.reply({
        embeds: [createSuccessEmbed(
          `${emoji} Repeat Mode: ${modeName}`,
          description
        )]
      });

    } catch (error) {
      logger.error('Repeat command error:', error);
      return interaction.reply({
        embeds: [createErrorEmbed('Failed to set repeat mode', error.message)],
        flags: [64]
      });
    }
  }
};
