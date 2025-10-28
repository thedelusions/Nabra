import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, getTrackInfo } from '../../utils/embeds.js';
import { COLORS, EMOJIS } from '../../utils/constants.js';
import playerManager from '../../core/player.js';

export default {
  data: new SlashCommandBuilder()
    .setName('controls')
    .setDescription('🎛️ Display interactive music controls'),

  async execute(interaction) {
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

    const trackInfo = getTrackInfo(currentTrack);
    const position = player.position || player.queue?.current?.position || 0;
    const duration = trackInfo.length || 0;
    
    // Create progress bar
    const progress = duration > 0 ? Math.floor((position / duration) * 20) : 0;
    const progressBar = '▬'.repeat(Math.max(0, progress)) + '🔘' + '▬'.repeat(Math.max(0, 20 - progress));
    
    // Format time
    const formatTime = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentTime = formatTime(position);
    const totalTime = duration > 0 ? formatTime(duration) : 'Live';

    // Create buttons
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_previous')
          .setEmoji(EMOJIS.PREVIOUS)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!player.queue || player.queue.previous.length === 0),
        new ButtonBuilder()
          .setCustomId('music_playpause')
          .setEmoji(player.paused ? EMOJIS.PLAY : EMOJIS.PAUSE)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setEmoji(EMOJIS.SKIP)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!player.queue || player.queue.tracks.length === 0),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setEmoji(EMOJIS.STOP)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('music_shuffle')
          .setEmoji(EMOJIS.SHUFFLE)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!player.queue || player.queue.tracks.length < 2)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_repeat')
          .setEmoji(player.repeatMode === 'track' ? '🔂' : player.repeatMode === 'queue' ? '🔁' : '▶️')
          .setLabel(player.repeatMode === 'track' ? 'Track' : player.repeatMode === 'queue' ? 'Queue' : 'Off')
          .setStyle(player.repeatMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_volumedown')
          .setEmoji('🔉')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_volumeup')
          .setEmoji('🔊')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_queue')
          .setEmoji(EMOJIS.QUEUE)
          .setLabel('Queue')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_refresh')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary)
      );

    const embed = createEmbed(
      `${EMOJIS.MUSIC} Now Playing`,
      null,
      COLORS.PRIMARY
    )
      .setThumbnail(trackInfo.thumbnail)
      .addFields(
        { name: '🎵 Track', value: `**[${trackInfo.title}](${trackInfo.uri})**`, inline: false },
        { name: '👤 Artist', value: trackInfo.author, inline: true },
        { name: '⏱️ Duration', value: totalTime, inline: true },
        { name: '🔊 Volume', value: `${player.volume || 100}%`, inline: true },
        { name: '📊 Progress', value: `${progressBar}\n${currentTime} / ${totalTime}`, inline: false }
      );

    if (player.queue && player.queue.tracks.length > 0) {
      embed.addFields({
        name: `${EMOJIS.QUEUE} Up Next`,
        value: `**${player.queue.tracks[0].info?.title || player.queue.tracks[0].title}**\n${player.queue.tracks.length - 1} more in queue`,
        inline: false
      });
    }

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2]
    });
  }
};
