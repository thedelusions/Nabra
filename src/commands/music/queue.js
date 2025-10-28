import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import playerManager from '../../core/player.js';
import { getTrackInfo, formatDuration } from '../../utils/embeds.js';
import { COLORS, EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

const ITEMS_PER_PAGE = 10;

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current music queue'),

  async execute(interaction, page = 0) {
    try {
      const player = playerManager.getPlayer(interaction.guild.id);

      if (!player) {
        return interaction.reply({
          content: '❌ No active player in this server!',
          flags: [64] // MessageFlags.Ephemeral
        });
      }

      const currentTrack = player.current || player.queue?.current;
      const queueTracks = player.queue?.tracks || [];

      if (!currentTrack && queueTracks.length === 0) {
        return interaction.reply({
          content: '❌ Queue is empty!',
          flags: [64] // MessageFlags.Ephemeral
        });
      }

      const totalPages = Math.ceil(queueTracks.length / ITEMS_PER_PAGE);
      const currentPage = Math.max(0, Math.min(page, totalPages - 1));
      
      const embed = createQueueEmbed(queueTracks, currentTrack, interaction.guild.name, currentPage);
      
      // Create pagination buttons
      const row = new ActionRowBuilder();
      
      if (totalPages > 1) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`queue_first_${interaction.user.id}`)
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`queue_prev_${interaction.user.id}`)
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`queue_page_${interaction.user.id}`)
            .setLabel(`Page ${currentPage + 1}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`queue_next_${interaction.user.id}`)
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages - 1),
          new ButtonBuilder()
            .setCustomId(`queue_last_${interaction.user.id}`)
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1)
        );
      }

      const response = {
        embeds: [embed],
        flags: [64]
      };

      if (totalPages > 1) {
        response.components = [row];
      }

      // Store page info for button handlers
      if (!interaction.client.queuePages) {
        interaction.client.queuePages = new Map();
      }
      interaction.client.queuePages.set(interaction.user.id, currentPage);

      return interaction.reply(response);

    } catch (error) {
      logger.error('Queue command error:', error);
      return interaction.reply({
        content: `❌ Failed to display queue: ${error.message}`,
        flags: [64]
      });
    }
  }
};

function createQueueEmbed(queueTracks, currentTrack, guildName, page = 0) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.QUEUE)
    .setTitle(`${EMOJIS.QUEUE} Music Queue - ${guildName}`)
    .setTimestamp();

  // Current track
  if (currentTrack) {
    const trackInfo = getTrackInfo(currentTrack);
    const duration = trackInfo.isLive ? '🔴 Live' : formatDuration(trackInfo.duration);
    embed.addFields([{
      name: '🎵 Now Playing',
      value: `**[${trackInfo.title}](${trackInfo.uri})**\n${EMOJIS.MICROPHONE} ${trackInfo.author} • ${duration}`,
      inline: false
    }]);
  }

  // Queue tracks (paginated)
  if (queueTracks.length > 0) {
    const start = page * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, queueTracks.length);
    const pageTracks = queueTracks.slice(start, end);

    const queueList = pageTracks.map((track, index) => {
      const trackInfo = getTrackInfo(track);
      const duration = trackInfo.isLive ? '🔴 Live' : formatDuration(trackInfo.duration);
      const position = start + index + 1;
      return `**${position}.** [${trackInfo.title}](${trackInfo.uri})\n${EMOJIS.MICROPHONE} ${trackInfo.author} • ${duration}`;
    }).join('\n\n');

    embed.addFields([{
      name: `📜 Up Next (${queueTracks.length} track${queueTracks.length !== 1 ? 's' : ''})`,
      value: queueList || 'No tracks in queue',
      inline: false
    }]);

    // Total duration
    const totalDuration = queueTracks.reduce((acc, track) => {
      const info = getTrackInfo(track);
      return acc + (info.duration || 0);
    }, 0);

    embed.setFooter({ 
      text: `Total queue time: ${formatDuration(totalDuration)} • Page ${page + 1}/${Math.ceil(queueTracks.length / ITEMS_PER_PAGE)}` 
    });
  } else {
    embed.addFields([{
      name: '📜 Up Next',
      value: 'No tracks in queue',
      inline: false
    }]);
  }

  return embed;
}
