import { SlashCommandBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import { createSuccessEmbed, createErrorEmbed, getTrackInfo } from '../../utils/embeds.js';
import { EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';
import { is247Enabled } from './247.js';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),

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

      // Check if there's a current track playing
      if (!player.playing && !player.paused) {
        return interaction.reply({
          embeds: [createErrorEmbed('Nothing is currently playing!')],
          ephemeral: true
        });
      }

      const trackInfo = getTrackInfo(player.current);
      const trackTitle = trackInfo.title;
      
      // Check if there are more tracks in queue (for Lavalink players)
      if (!player.isPlayDl && player.queue?.tracks?.length === 0) {
        // Check 24/7 mode
        const is247 = is247Enabled(interaction.guild.id);
        
        if (!is247) {
          // This is the last track, destroy the player
          player.destroy();
          logger.info(`Destroyed player after skipping last track in guild ${interaction.guild.id}: ${trackTitle}`);
          
          return interaction.reply({
            embeds: [createSuccessEmbed('⏭️ Skipped!', `**${trackTitle}** was the last track.\n\n${EMOJIS.SPARKLES} Queue has ended. Use \`/play\` to add more music!`)]
          });
        } else {
          // 24/7 mode is on, stop playback but stay connected
          player.stop();
          logger.info(`Stopped player (24/7 mode) after skipping last track in guild ${interaction.guild.id}: ${trackTitle}`);
          
          return interaction.reply({
            embeds: [createSuccessEmbed('⏭️ Skipped!', `**${trackTitle}** was the last track.\n\n🔄 24/7 mode is enabled - staying connected. Use \`/play\` to add more music!`)]
          });
        }
      }
      
      player.skip();
      logger.info(`Skipped track in guild ${interaction.guild.id}: ${trackTitle}`);

      return interaction.reply({
        embeds: [createSuccessEmbed('⏭️ Track Skipped!', `Skipped **${trackTitle}**\n\n${EMOJIS.MUSICAL_NOTE} Playing next track...`)]
      });

    } catch (error) {
      logger.error('Skip command error:', error);
      return interaction.reply({
        embeds: [createErrorEmbed('Failed to skip the track', error.message)],
        ephemeral: true
      });
    }
  }
};
