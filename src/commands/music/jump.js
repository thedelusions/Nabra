import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import { createEmbed, getTrackInfo } from '../../utils/embeds.js';
import { COLORS, EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('jump')
    .setDescription('Jump to a specific track in the queue')
    .addIntegerOption(option =>
      option
        .setName('position')
        .setDescription('Position in queue to jump to (1 = next track)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
      if (!interaction.member.voice.channel) {
        return interaction.reply({
          embeds: [createEmbed('Voice Channel Required', 'You need to be in a voice channel!', COLORS.ERROR)],
          flags: [64]
        });
      }

      const player = playerManager.getPlayer(interaction.guild.id);

      if (!player) {
        return interaction.reply({
          embeds: [createEmbed('No Player', 'No active player in this server!', COLORS.ERROR)],
          flags: [64]
        });
      }

      const queue = player.queue?.tracks || [];

      if (queue.length === 0) {
        return interaction.reply({
          embeds: [createEmbed('Empty Queue', 'Queue is empty!', COLORS.ERROR)],
          flags: [64]
        });
      }

      const position = interaction.options.getInteger('position');

      // If no position provided, show the queue list
      if (!position) {
        const itemsPerPage = 10;
        const queueList = queue.slice(0, itemsPerPage).map((track, index) => {
          const info = getTrackInfo(track);
          return `**${index + 1}.** ${info.title} - *${info.author}*`;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setColor(COLORS.QUEUE)
          .setTitle(`${EMOJIS.QUEUE} Queue - Choose Track to Jump`)
          .setDescription(queueList)
          .setFooter({ 
            text: queue.length > itemsPerPage 
              ? `Showing ${itemsPerPage} of ${queue.length} tracks • Use /jump position:<number>` 
              : `Total: ${queue.length} track${queue.length !== 1 ? 's' : ''} • Use /jump position:<number>`
          })
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          flags: [64]
        });
      }

      // If position is provided, jump to that track
      if (position > queue.length) {
        return interaction.reply({
          embeds: [createEmbed(
            'Invalid Position',
            `Invalid position! Queue has only ${queue.length} track${queue.length !== 1 ? 's' : ''}.`,
            COLORS.ERROR
          )],
          flags: [64]
        });
      }

      // Skip to the track (position - 1 because we're skipping TO that position)
      const skipsNeeded = position;
      
      // For Lavalink players
      if (!player.isPlayDl) {
        // Skip multiple times to reach the desired track
        for (let i = 0; i < skipsNeeded; i++) {
          if (i === skipsNeeded - 1) {
            // Last skip
            player.skip();
          } else {
            // Remove and skip
            if (player.queue?.tracks?.length > 0) {
              player.queue.tracks.shift();
            }
          }
        }
      } else {
        // For play-dl players - just skip multiple times
        for (let i = 0; i < skipsNeeded; i++) {
          player.skip();
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between skips
        }
      }

      const targetTrack = queue[position - 1];
      const trackInfo = getTrackInfo(targetTrack);
      
      logger.info(`Jumped to track #${position} in guild ${interaction.guild.id}`);

      return interaction.reply({
        embeds: [createEmbed(
          `${EMOJIS.SKIP} Jumped to Track #${position}`,
          `Now playing: **${trackInfo.title}**\n${EMOJIS.MICROPHONE} ${trackInfo.author}`,
          COLORS.SUCCESS
        )]
      });

    } catch (error) {
      logger.error('Jump command error:', error);
      return interaction.reply({
        embeds: [createEmbed('Error', `Failed to jump to track: ${error.message}`, COLORS.ERROR)],
        flags: [64]
      });
    }
  }
};
