import { SlashCommandBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear the entire queue'),

  async execute(interaction) {
    try {
      if (!interaction.member.voice.channel) {
        return interaction.reply({
          embeds: [createErrorEmbed('You need to be in a voice channel!')],
          ephemeral: true
        });
      }

      const player = playerManager.getPlayer(interaction.guild.id);

      if (!player) {
        return interaction.reply({
          embeds: [createErrorEmbed('No active player in this server!')],
          ephemeral: true
        });
      }

      const queueSize = player.queue?.tracks?.length || 0;
      
      if (player.isPlayDl) {
        player.clear();
      } else if (player.queue?.clear) {
        player.queue.clear();
      }
      
      logger.info(`Cleared queue in guild ${interaction.guild.id} (${queueSize} tracks)`);

      return interaction.reply({
        embeds: [createSuccessEmbed(`🗑️ Cleared ${queueSize} track(s) from the queue`)]
      });

    } catch (error) {
      logger.error('Clear command error:', error);
      return interaction.reply({
        embeds: [createErrorEmbed('Failed to clear queue', error.message)],
        ephemeral: true
      });
    }
  }
};
