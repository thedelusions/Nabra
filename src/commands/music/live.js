import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import playerManager from '../../core/player.js';
import { getTrackInfo, formatDuration } from '../../utils/embeds.js';
import { COLORS, EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

// Store active live displays per guild
const liveDisplays = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('live')
    .setDescription('Show auto-updating now playing display'),

  async execute(interaction) {
    try {
      const player = playerManager.getPlayer(interaction.guild.id);

      if (!player) {
        return interaction.reply({
          content: '❌ Nothing is currently playing!',
          flags: [64]
        });
      }

      const currentTrack = player.current || player.queue?.current;

      if (!currentTrack) {
        return interaction.reply({
          content: '❌ No track information available!',
          flags: [64]
        });
      }

      // Stop any existing live display for this guild
      if (liveDisplays.has(interaction.guild.id)) {
        const { interval, message } = liveDisplays.get(interaction.guild.id);
        clearInterval(interval);
        try {
          await message.edit({ components: [] });
        } catch (e) {
          // Message might be deleted
        }
      }

      // Create stop button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`live_stop_${interaction.guild.id}`)
            .setLabel('Stop Live Update')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger)
        );

      // Send initial message
      await interaction.reply({
        embeds: [createLiveEmbed(player, currentTrack)],
        components: [row]
      });
      
      const message = await interaction.fetchReply();

      // Update every 5 seconds
      const interval = setInterval(async () => {
        try {
          const updatedPlayer = playerManager.getPlayer(interaction.guild.id);
          if (!updatedPlayer || (!updatedPlayer.current && !updatedPlayer.queue?.current)) {
            clearInterval(interval);
            liveDisplays.delete(interaction.guild.id);
            await message.edit({
              content: '⏹️ Playback ended',
              embeds: [],
              components: []
            });
            return;
          }

          const updatedTrack = updatedPlayer.current || updatedPlayer.queue?.current;
          await message.edit({
            embeds: [createLiveEmbed(updatedPlayer, updatedTrack)],
            components: [row]
          });
        } catch (error) {
          logger.error('Live display update error:', error);
          clearInterval(interval);
          liveDisplays.delete(interaction.guild.id);
        }
      }, 5000);

      // Store interval for cleanup
      liveDisplays.set(interaction.guild.id, { interval, message });

      // Auto-cleanup after 10 minutes
      setTimeout(() => {
        if (liveDisplays.has(interaction.guild.id)) {
          const { interval: storedInterval } = liveDisplays.get(interaction.guild.id);
          if (storedInterval === interval) {
            clearInterval(interval);
            liveDisplays.delete(interaction.guild.id);
            message.edit({ components: [] }).catch(() => {});
          }
        }
      }, 600000);

    } catch (error) {
      logger.error('Live command error:', error);
      return interaction.reply({
        content: `❌ Error: ${error.message}`,
        flags: [64]
      });
    }
  }
};

function createLiveEmbed(player, track) {
  const trackInfo = getTrackInfo(track);
  const position = player.position || 0;
  const duration = trackInfo.length || 0;
  
  // Create progress bar
  const progress = duration > 0 ? Math.floor((position / duration) * 20) : 0;
  const progressBar = '▬'.repeat(Math.max(0, progress)) + '🔘' + '▬'.repeat(Math.max(0, 20 - progress));
  
  const currentTime = formatDuration(position);
  const totalTime = duration > 0 ? formatDuration(duration) : 'Live';
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.MUSIC)
    .setTitle(`${EMOJIS.MUSIC} Live Now Playing`)
    .setThumbnail(trackInfo.thumbnail)
    .setDescription(`**[${trackInfo.title}](${trackInfo.uri})**`)
    .addFields(
      { name: '👤 Artist', value: trackInfo.author, inline: true },
      { name: '⏱️ Duration', value: totalTime, inline: true },
      { name: '🔊 Volume', value: `${player.volume || 100}%`, inline: true },
      { name: '📊 Progress', value: `${progressBar}\n${currentTime} / ${totalTime}`, inline: false }
    )
    .setFooter({ text: '🔄 Updates every 5 seconds' })
    .setTimestamp();

  if (player.queue && player.queue.tracks.length > 0) {
    const nextTrack = getTrackInfo(player.queue.tracks[0]);
    embed.addFields({
      name: `${EMOJIS.QUEUE} Up Next`,
      value: `**${nextTrack.title}**\n${player.queue.tracks.length - 1} more in queue`,
      inline: false
    });
  }

  return embed;
}

// Handle button clicks
export function handleLiveStop(interaction) {
  const guildId = interaction.customId.split('_')[2];
  
  if (liveDisplays.has(guildId)) {
    const { interval } = liveDisplays.get(guildId);
    clearInterval(interval);
    liveDisplays.delete(guildId);
    
    interaction.update({
      content: '⏹️ Stopped live update',
      embeds: [],
      components: []
    });
  } else {
    interaction.reply({
      content: '❌ Live display already stopped',
      flags: [64]
    });
  }
}
