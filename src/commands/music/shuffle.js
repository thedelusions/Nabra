import { SlashCommandBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import queueManager from '../../core/queueManager.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the queue'),

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

      // Shuffle the queue
      if (player.isPlayDl) {
        // Get the actual playerData for play-dl
        const playerData = playerManager.playDlPlayers.get(interaction.guild.id);
        if (!playerData || playerData.queue.length === 0) {
          return interaction.reply({
            embeds: [createErrorEmbed('The queue is empty!')],
            ephemeral: true
          });
        }
        
        playerData.queue = queueManager.shuffleArray(playerData.queue);
        logger.info(`Shuffled play-dl queue in guild ${interaction.guild.id}`);
        
        return interaction.reply({
          embeds: [createSuccessEmbed(`🔀 Shuffled ${playerData.queue.length} track(s)`)]
        });
      } else {
        // Lavalink player
        if (!player.queue?.tracks || player.queue.tracks.length === 0) {
          return interaction.reply({
            embeds: [createErrorEmbed('The queue is empty!')],
            ephemeral: true
          });
        }
        
        player.queue.shuffle();
        logger.info(`Shuffled Lavalink queue in guild ${interaction.guild.id}`);
        
        return interaction.reply({
          embeds: [createSuccessEmbed(`🔀 Shuffled ${player.queue.tracks.length} track(s)`)]
        });
      }

    } catch (error) {
      logger.error('Shuffle command error:', error);
      return interaction.reply({
        embeds: [createErrorEmbed('Failed to shuffle the queue', error.message)],
        ephemeral: true
      });
    }
  }
};
