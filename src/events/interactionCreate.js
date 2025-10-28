import { Events } from 'discord.js';
import logger from '../utils/logger.js';
import { createEmbed, getTrackInfo } from '../utils/embeds.js';
import { COLORS, EMOJIS } from '../utils/constants.js';
import playerManager from '../core/player.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const receivedTime = Date.now();
      const interactionAge = receivedTime - interaction.createdTimestamp;
      logger.info(`⏱️ Interaction received - Age: ${interactionAge}ms, Command: ${interaction.commandName}`);

      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        logger.info(`Executing command: ${interaction.commandName} (User: ${interaction.user.tag}, Guild: ${interaction.guild?.name || 'DM'})`);
        const executeStart = Date.now();
        await command.execute(interaction);
        const executeTime = Date.now() - executeStart;
        logger.info(`✓ Command ${interaction.commandName} executed in ${executeTime}ms`);
      } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);

        const errorEmbed = createEmbed(
          'Error',
          'An error occurred while executing this command!',
          COLORS.ERROR
        );

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          logger.error('Failed to send error message:', replyError.message);
        }
      }
    }

    // Handle button interactions
    if (interaction.isButton()) {
      // Handle live display stop button
      if (interaction.customId.startsWith('live_stop_')) {
        const { handleLiveStop } = await import('../commands/music/live.js');
        return handleLiveStop(interaction);
      }

      // Handle queue pagination buttons
      if (interaction.customId.startsWith('queue_')) {
        const [, type, userId] = interaction.customId.split('_');
        
        // Check if button is for this user
        if (userId !== interaction.user.id) {
          return interaction.reply({
            content: '❌ This queue is not yours! Use `/queue` to view your own.',
            ephemeral: true
          });
        }

        const queuePages = interaction.client.queuePages || new Map();
        let currentPage = queuePages.get(interaction.user.id) || 0;
        
        const player = playerManager.getPlayer(interaction.guild.id);
        if (!player) {
          return interaction.update({
            content: '❌ No active player!',
            embeds: [],
            components: []
          });
        }

        const queueTracks = player.queue?.tracks || [];
        const totalPages = Math.ceil(queueTracks.length / 10);

        // Handle navigation
        switch (type) {
          case 'first':
            currentPage = 0;
            break;
          case 'prev':
            currentPage = Math.max(0, currentPage - 1);
            break;
          case 'next':
            currentPage = Math.min(totalPages - 1, currentPage + 1);
            break;
          case 'last':
            currentPage = totalPages - 1;
            break;
        }

        queuePages.set(interaction.user.id, currentPage);

        // Re-import and execute queue command
        const queueCommand = interaction.client.commands.get('queue');
        if (queueCommand) {
          // Create a mock interaction for the update
          const mockInteraction = {
            ...interaction,
            reply: (options) => interaction.update(options)
          };
          await queueCommand.execute(mockInteraction, currentPage);
        }
        return;
      }

      const player = playerManager.getPlayer(interaction.guild.id);

      if (!player) {
        return interaction.reply({
          embeds: [createEmbed(
            'No Track Playing',
            'There is no music currently playing!',
            COLORS.ERROR
          )],
          ephemeral: true
        });
      }

      const currentTrack = player.current || player.queue?.current;

      if (!currentTrack) {
        return interaction.reply({
          embeds: [createEmbed(
            'No Track Playing',
            'No track information available!',
            COLORS.ERROR
          )],
          ephemeral: true
        });
      }

      try {
        switch (interaction.customId) {
          case 'music_playpause':
            if (player.paused) {
              player.resume();
              await interaction.reply({
                embeds: [createEmbed(
                  `${EMOJIS.PLAY} Resumed`,
                  `Playback resumed!`,
                  COLORS.SUCCESS
                )],
                ephemeral: true
              });
            } else {
              player.pause();
              await interaction.reply({
                embeds: [createEmbed(
                  `${EMOJIS.PAUSE} Paused`,
                  `Playback paused!`,
                  COLORS.SUCCESS
                )],
                ephemeral: true
              });
            }
            break;

          case 'music_skip':
            if (!player.queue || player.queue.tracks.length === 0) {
              player.destroy();
              await interaction.reply({
                embeds: [createEmbed(
                  `${EMOJIS.STOP} Queue Ended`,
                  'No more tracks in the queue. Disconnected!',
                  COLORS.INFO
                )],
                ephemeral: true
              });
            } else {
              const trackInfo = getTrackInfo(currentTrack);
              player.skip();
              await interaction.reply({
                embeds: [createEmbed(
                  `${EMOJIS.SKIP} Skipped`,
                  `Skipped **${trackInfo.title}**`,
                  COLORS.SUCCESS
                )],
                ephemeral: true
              });
            }
            break;

          case 'music_previous': {
            if (!player.queue || !player.queue.previous || player.queue.previous.length === 0) {
              return interaction.reply({
                embeds: [createEmbed(
                  'No Previous Track',
                  'There are no previous tracks to go back to!',
                  COLORS.ERROR
                )],
                ephemeral: true
              });
            }
            // Go back to previous track
            const previousTrack = player.queue.previous[player.queue.previous.length - 1];
            player.queue.previous.pop();
            
            // Add current track back to front of queue
            if (currentTrack && player.queue.tracks) {
              player.queue.tracks.unshift(currentTrack);
            }
            
            // Play previous track
            if (player.play) {
              player.play(previousTrack);
            } else {
              // For Lavalink players
              player.queue.current = previousTrack;
              if (player.skip) player.skip();
            }
            
            const prevInfo = getTrackInfo(previousTrack);
            await interaction.reply({
              embeds: [createEmbed(
                `${EMOJIS.PREVIOUS} Previous Track`,
                `Now playing **${prevInfo.title}**`,
                COLORS.SUCCESS
              )],
              ephemeral: true
            });
            break;
          }

          case 'music_stop':
            player.destroy();
            await interaction.reply({
              embeds: [createEmbed(
                `${EMOJIS.STOP} Stopped`,
                'Playback stopped and disconnected from voice channel!',
                COLORS.SUCCESS
              )],
              ephemeral: true
            });
            break;

          case 'music_shuffle':
            if (!player.queue || player.queue.tracks.length < 2) {
              return interaction.reply({
                embeds: [createEmbed(
                  'Cannot Shuffle',
                  'Need at least 2 tracks in queue to shuffle!',
                  COLORS.ERROR
                )],
                ephemeral: true
              });
            }
            
            // Fisher-Yates shuffle
            for (let i = player.queue.tracks.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [player.queue.tracks[i], player.queue.tracks[j]] = [player.queue.tracks[j], player.queue.tracks[i]];
            }
            
            await interaction.reply({
              embeds: [createEmbed(
                `${EMOJIS.SHUFFLE} Shuffled`,
                `Shuffled **${player.queue.tracks.length}** tracks in the queue!`,
                COLORS.SUCCESS
              )],
              ephemeral: true
            });
            break;

          case 'music_repeat': {
            let newMode;
            if (player.repeatMode === 'off') {
              player.setRepeatMode('track');
              newMode = { mode: 'track', emoji: '🔂', text: 'Track Repeat' };
            } else if (player.repeatMode === 'track') {
              player.setRepeatMode('queue');
              newMode = { mode: 'queue', emoji: '🔁', text: 'Queue Repeat' };
            } else {
              player.setRepeatMode('off');
              newMode = { mode: 'off', emoji: '▶️', text: 'Repeat Off' };
            }
            
            await interaction.reply({
              embeds: [createEmbed(
                `${newMode.emoji} ${newMode.text}`,
                `Repeat mode set to **${newMode.text}**`,
                COLORS.SUCCESS
              )],
              ephemeral: true
            });
            break;
          }

          case 'music_volumedown': {
            const newVolDown = Math.max(0, (player.volume || 100) - 10);
            player.setVolume(newVolDown);
            await interaction.reply({
              embeds: [createEmbed(
                '🔉 Volume Decreased',
                `Volume set to **${newVolDown}%**`,
                COLORS.SUCCESS
              )],
              ephemeral: true
            });
            break;
          }

          case 'music_volumeup': {
            const newVolUp = Math.min(200, (player.volume || 100) + 10);
            player.setVolume(newVolUp);
            await interaction.reply({
              embeds: [createEmbed(
                '🔊 Volume Increased',
                `Volume set to **${newVolUp}%**`,
                COLORS.SUCCESS
              )],
              ephemeral: true
            });
            break;
          }

          case 'music_queue': {
            const queueCommand = interaction.client.commands.get('queue');
            if (queueCommand) {
              await queueCommand.execute(interaction);
            }
            break;
          }

          case 'music_refresh': {
            // Refresh the controls message
            const controlsCommand = interaction.client.commands.get('controls');
            if (controlsCommand) {
              await interaction.deferUpdate();
              await interaction.message.delete();
              await controlsCommand.execute(interaction);
            }
            break;
          }

          default:
            await interaction.reply({
              embeds: [createEmbed(
                'Unknown Button',
                'This button is not recognized!',
                COLORS.ERROR
              )],
              ephemeral: true
            });
        }
      } catch (error) {
        logger.error('Error handling button interaction:', error);
        const errorMsg = {
          embeds: [createEmbed(
            'Error',
            'There was an error processing your button click!',
            COLORS.ERROR
          )],
          ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMsg);
        } else {
          await interaction.reply(errorMsg);
        }
      }
    }
  }
};
