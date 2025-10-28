import { SlashCommandBuilder } from 'discord.js';
import playerManager from '../../core/player.js';
import { createSuccessEmbed, createErrorEmbed, formatDuration, getTrackInfo } from '../../utils/embeds.js';
import { EMOJIS } from '../../utils/constants.js';
import logger from '../../utils/logger.js';
import { isMusicPlatformUrl, convertMusicPlatformUrl, getPlatformName } from '../../utils/musicPlatforms.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or add it to the queue')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name, URL, or search query')
        .setRequired(true)
    ),

  async execute(interaction) {
    const startTime = Date.now();
    const interactionAge = startTime - interaction.createdTimestamp;
    logger.info(`🎵 Play command started - Interaction age: ${interactionAge}ms`);
    
    try {
      // Check if user is in voice channel first (fast check)
      if (!interaction.member.voice.channel) {
        return interaction.reply({
          embeds: [createErrorEmbed('You need to be in a voice channel to play music!')],
          ephemeral: true
        });
      }

      const query = interaction.options.getString('query');
      logger.info(`Play command: ${query} (Guild: ${interaction.guild.id})`);

      // Instant reply instead of defer - shows immediately
      await interaction.reply({
        content: `${EMOJIS.LOADING} Loading...`,
      });
      const replyTime = Date.now() - startTime;
      logger.info(`✓ Replied in ${replyTime}ms`);

      // Check if it's a Spotify/Apple Music link and convert it
      let convertedQuery = query;
      let platformName = null;
      
      if (isMusicPlatformUrl(query)) {
        platformName = getPlatformName(query);
        logger.info(`Detected ${platformName} link, converting...`);
        const converted = await convertMusicPlatformUrl(query);
        if (converted) {
          convertedQuery = converted;
          logger.info(`Converted to: ${convertedQuery}`);
        } else {
          logger.warn(`Failed to convert ${platformName} link`);
        }
      }

      // Play the track
      const result = await playerManager.play(interaction, convertedQuery);

      if (result.playlistSize) {
        // Playlist added
        const trackInfo = getTrackInfo(result.track);
        await interaction.editReply({
          content: null,
          embeds: [createSuccessEmbed(
            `📜 Added Playlist`,
            `**${result.playlistSize} tracks** added\n\n${EMOJIS.PLAY} Now playing: **${trackInfo.title}**`
          )]
        });
      } else if (result.queuePosition === 0) {
        // Playing now - delete the loading message since "Now Playing" embed will appear
        await interaction.deleteReply().catch(() => {});
      } else {
        const trackInfo = getTrackInfo(result.track);
        const duration = trackInfo.isLive ? '🔴 Live' : (trackInfo.duration ? formatDuration(trackInfo.duration) : '0:00');
        await interaction.editReply({
          content: null,
          embeds: [createSuccessEmbed(
            `${EMOJIS.QUEUE} Added to Queue!`,
            `**${trackInfo.title}**\n\n${EMOJIS.MICROPHONE} ${trackInfo.author}\n${EMOJIS.HEADPHONES} Duration: \`${duration}\`\n📍 Position in queue: **#${result.queuePosition}**`
          )]
        });
      }

    } catch (error) {
      logger.error('Play command error:', error);
      
      try {
        // Always try editReply since we defer at the start
        await interaction.editReply({
          embeds: [createErrorEmbed('Failed to play the track', error.message)]
        });
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError.message);
      }
    }
  }
};
