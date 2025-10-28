import { SlashCommandBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import { createSuccessEmbed, createErrorEmbed, getTrackInfo, formatDuration } from '../../utils/embeds.js';
import { EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('forward')
    .setDescription('Skip forward in the current track')
    .addIntegerOption(option =>
      option
        .setName('seconds')
        .setDescription('Number of seconds to skip forward')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(300)
    ),

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

      const seconds = interaction.options.getInteger('seconds');

      // Only Lavalink supports seeking
      if (player.isPlayDl) {
        return interaction.reply({
          embeds: [createErrorEmbed('Seeking is not supported with the current playback engine. Only available when using Lavalink.')],
          ephemeral: true
        });
      }

      // Lavalink player - check if it has seek method
      if (!player.seek || typeof player.position === 'undefined') {
        return interaction.reply({
          embeds: [createErrorEmbed('Seeking is not supported with the current playback engine.')],
          ephemeral: true
        });
      }

      const currentPosition = player.position;
      const newPosition = currentPosition + (seconds * 1000);
      const trackInfo = getTrackInfo(player.queue?.current || player.current);
      const duration = trackInfo.duration;

      if (duration && newPosition >= duration) {
        return interaction.reply({
          embeds: [createErrorEmbed('Cannot skip beyond track duration!')],
          ephemeral: true
        });
      }

      player.seek(newPosition);
      logger.info(`Skipped forward ${seconds}s in guild ${interaction.guild.id}`);

      const newPosFormatted = formatDuration(newPosition);
      const durationFormatted = duration ? formatDuration(duration) : 'Live';

      return interaction.reply({
        embeds: [createSuccessEmbed(
          '⏩ Skipped Forward',
          `Jumped **${seconds}s** ahead\n\n${EMOJIS.HEADPHONES} New position: \`${newPosFormatted}\` / \`${durationFormatted}\``
        )]
      });

    } catch (error) {
      logger.error('Forward command error:', error);
      return interaction.reply({
        embeds: [createErrorEmbed('Failed to skip forward', error.message)],
        ephemeral: true
      });
    }
  }
};
