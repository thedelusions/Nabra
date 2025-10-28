import { SlashCommandBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import { createSuccessEmbed, createErrorEmbed, getTrackInfo } from '../../utils/embeds.js';
import { EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused track'),

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
      
      if (!currentTrack) {
        return interaction.reply({
          embeds: [createErrorEmbed('No track information available!')],
          flags: [64]
        });
      }

      if (!player.paused) {
        return interaction.reply({
          embeds: [createErrorEmbed('The player is not paused!')],
          flags: [64]
        });
      }

      const trackInfo = getTrackInfo(currentTrack);
      player.resume();
      logger.info(`Resumed player in guild ${interaction.guild.id}`);

      return interaction.reply({
        embeds: [createSuccessEmbed('▶️ Resumed!', `Now playing **${trackInfo.title}**\n\n${EMOJIS.FIRE} Enjoy the music!`)]
      });

    } catch (error) {
      logger.error('Resume command error:', error);
      return interaction.reply({
        embeds: [createErrorEmbed('Failed to resume playback', error.message)],
        flags: [64]
      });
    }
  }
};
