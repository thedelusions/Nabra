import { SlashCommandBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import { createSuccessEmbed, createErrorEmbed, getTrackInfo } from '../../utils/embeds.js';
import { EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the currently playing track'),

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
        return interaction.reply({
          embeds: [createErrorEmbed('Nothing is currently playing!')],
          flags: [64]
        });
      }

      const currentTrack = player.current || player.queue?.current;
      
      if (!currentTrack && !player.paused) {
        return interaction.reply({
          embeds: [createErrorEmbed('Nothing is currently playing!')],
          flags: [64]
        });
      }

      if (player.paused) {
        return interaction.reply({
          embeds: [createErrorEmbed('The player is already paused!')],
          flags: [64]
        });
      }

      const trackInfo = getTrackInfo(currentTrack);
      player.pause();
      logger.info(`Paused player in guild ${interaction.guild.id}`);

      return interaction.reply({
        embeds: [createSuccessEmbed('⏸️ Paused', `**${trackInfo.title}**\n\n${EMOJIS.HEADPHONES} Use \`/resume\` to continue playing.`)]
      });

    } catch (error) {
      logger.error('Pause command error:', error);
      return interaction.reply({
        embeds: [createErrorEmbed('Failed to pause the track', error.message)],
        flags: [64]
      });
    }
  }
};
