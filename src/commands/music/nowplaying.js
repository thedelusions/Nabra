import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import { createErrorEmbed, getTrackInfo, formatDuration } from '../../utils/embeds.js';
import { COLORS, EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show detailed information about the currently playing track'),

  async execute(interaction) {
    try {
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

      const trackInfo = getTrackInfo(currentTrack);
      const duration = trackInfo.isLive ? '🔴 Live Stream' : formatDuration(trackInfo.duration);
      
      // Get current position if available
      const position = player.position || 0;
      const positionFormatted = trackInfo.isLive ? '🔴 Live' : formatDuration(position);
      
      // Calculate progress percentage
      let progressBar = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
      if (!trackInfo.isLive && trackInfo.duration > 0) {
        const progress = Math.floor((position / trackInfo.duration) * 20);
        progressBar = '🔘' + '▬'.repeat(progress) + '⚪' + '▬'.repeat(19 - progress);
      }

      // Get queue info
      const queueLength = player.queue?.tracks?.length || 0;
      const repeatMode = player.repeatMode || 'off';
      const volume = player.volume || 100;

      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setAuthor({ 
          name: 'Now Playing',
          iconURL: 'https://cdn.discordapp.com/emojis/741605543046807626.gif'
        })
        .setTitle(trackInfo.title)
        .setURL(trackInfo.uri)
        .setThumbnail(trackInfo.thumbnail)
        .addFields(
          { 
            name: `${EMOJIS.MICROPHONE} Artist`, 
            value: trackInfo.author, 
            inline: true 
          },
          { 
            name: `${EMOJIS.HEADPHONES} Duration`, 
            value: duration, 
            inline: true 
          },
          { 
            name: `${EMOJIS.SPEAKER} Volume`, 
            value: `${volume}%`, 
            inline: true 
          },
          { 
            name: '📍 Position', 
            value: `${positionFormatted} / ${duration}`, 
            inline: true 
          },
          { 
            name: `${EMOJIS.QUEUE} Queue`, 
            value: `${queueLength} track${queueLength !== 1 ? 's' : ''}`, 
            inline: true 
          },
          { 
            name: `${EMOJIS.REPEAT} Repeat`, 
            value: repeatMode.charAt(0).toUpperCase() + repeatMode.slice(1), 
            inline: true 
          },
          { 
            name: '⏱️ Progress', 
            value: progressBar, 
            inline: false 
          }
        )
        .setFooter({ 
          text: `Source: ${trackInfo.sourceName} | Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      logger.info(`Showed track info in guild ${interaction.guild.id}`);

      return interaction.reply({ embeds: [embed], flags: [64] });

    } catch (error) {
      logger.error('Now playing command error:', error);
      return interaction.reply({
        embeds: [createErrorEmbed('Failed to get track information', error.message)],
        flags: [64]
      });
    }
  }
};
