import { Events } from 'discord.js';
import playerManager from '../core/player.js';
import logger from '../utils/logger.js';

// Track guilds currently being cleaned up to prevent double processing
const cleanupInProgress = new Set();

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      const guild = newState.guild;
      const botMember = guild.members.me;
      
      // Check if the state change is about the bot
      if (oldState.member?.id === botMember.id) {
        // Bot was in a voice channel before
        if (oldState.channelId && !newState.channelId) {
          // Prevent double processing
          if (cleanupInProgress.has(guild.id)) {
            logger.debug(`Cleanup already in progress for guild ${guild.id}, skipping`);
            return;
          }
          
          // Bot was disconnected/kicked from voice channel
          logger.info(`Bot was disconnected from voice channel in guild ${guild.id}`);
          
          // Mark cleanup as in progress
          cleanupInProgress.add(guild.id);
          
          const player = playerManager.getPlayer(guild.id);
          if (player) {
            try {
              // Stop playback immediately
              if (player.pause) {
                player.pause();
              }
              
              // Clear the queue to prevent auto-play
              if (player.queue && player.queue.tracks) {
                player.queue.tracks = [];
                logger.info(`Cleared queue in guild ${guild.id} after disconnect`);
              }
              
              // Use playerManager.destroy() which handles both Lavalink and play-dl
              playerManager.destroy(guild.id);
              
              logger.info(`Destroyed player in guild ${guild.id} after disconnect`);
            } catch (error) {
              logger.error(`Error destroying player in guild ${guild.id}:`, error);
              // Force cleanup even if there was an error
              try {
                playerManager.destroy(guild.id);
              } catch (e) {
                logger.error(`Failed to force destroy player:`, e);
              }
            }
          }
          
          // Clear the cleanup flag after a short delay
          setTimeout(() => {
            cleanupInProgress.delete(guild.id);
          }, 2000);
          
          return;
        }
      }
      
      // Get the bot's current voice channel
      const botVoiceChannel = botMember?.voice?.channel;
      
      // If bot is not in a voice channel, ignore
      if (!botVoiceChannel) {
        return;
      }

      // Check if someone left the bot's voice channel
      if (oldState.channelId === botVoiceChannel.id && newState.channelId !== botVoiceChannel.id) {
        // A user left the channel
        logger.debug(`User ${oldState.member.user.tag} left voice channel in guild ${guild.id}`);
        
        // Check if bot is now alone
        playerManager.checkVoiceChannelMembers(guild.id, botVoiceChannel);
      }

    } catch (error) {
      logger.error('Error in voiceStateUpdate event:', error);
    }
  }
};
