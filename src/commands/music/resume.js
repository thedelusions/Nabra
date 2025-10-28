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
          ephemeral: true
        });
      }

      const player = playerManager.getPlayer(interaction.guild.id);

      if (!player) {
        return interaction.reply({
          embeds: [createErrorEmbed('Nothing is currently playing!')],
          ephemeral: true
        });
      }

      const currentTrack = player.current || player.queue?.current;
      
      if (!currentTrack) {
        return interaction.reply({
          embeds: [createErrorEmbed('No track information available!')],
          ephemeral: true
        });
      }

      if (!player.paused) {
        return interaction.reply({
          embeds: [createErrorEmbed('The player is not paused!')],
          ephemeral: true
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
        ephemeral: true
      });
    }
  }
};
