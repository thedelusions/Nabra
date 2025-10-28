import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from './constants.js';

export function createEmbed(title, description, color = COLORS.PRIMARY) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTimestamp();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  return embed;
}

export function createNowPlayingEmbed(track, requestedBy) {
  const trackInfo = getTrackInfo(track);
  const duration = trackInfo.isLive ? '🔴 Live' : (trackInfo.duration ? formatDuration(trackInfo.duration) : '0:00');
  
  // Create a visual progress bar
  const progressBar = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
  
  return new EmbedBuilder()
    .setColor(COLORS.MUSIC)
    .setAuthor({ 
      name: 'Now Playing', 
      iconURL: 'https://cdn.discordapp.com/emojis/741605543046807626.gif'
    })
    .setTitle(`${EMOJIS.MUSICAL_NOTE} ${trackInfo.title}`)
    .setURL(trackInfo.uri)
    .setDescription(`
      **${EMOJIS.MICROPHONE} Artist:** ${trackInfo.author}
      **${EMOJIS.HEADPHONES} Duration:** ${duration}
      **${EMOJIS.STAR} Requested by:** ${requestedBy}
      
      ${EMOJIS.SPEAKER} ${progressBar} 🔊
    `)
    .setThumbnail(trackInfo.thumbnail)
    .setFooter({ 
      text: `Source: ${trackInfo.sourceName} | ${EMOJIS.FIRE} Enjoying the music?`,
      iconURL: requestedBy.displayAvatarURL()
    })
    .setTimestamp();
}

export function createQueueEmbed(queue, currentTrack, guildName) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.QUEUE)
    .setAuthor({ 
      name: `Queue for ${guildName}`,
      iconURL: 'https://cdn.discordapp.com/emojis/829650419752058921.gif'
    })
    .setTimestamp();

  if (currentTrack) {
    const trackInfo = getTrackInfo(currentTrack);
    const duration = trackInfo.isLive ? '🔴 Live' : (trackInfo.duration ? formatDuration(trackInfo.duration) : '0:00');
    embed.addFields({
      name: `${EMOJIS.PLAY} Currently Playing`,
      value: `╰► **${trackInfo.title}**\n   └ ${EMOJIS.MICROPHONE} ${trackInfo.author} • ${EMOJIS.HEADPHONES} \`${duration}\``,
      inline: false
    });
  }

  if (queue.length === 0) {
    embed.setDescription(`${EMOJIS.MUSICAL_NOTE} Queue is empty!\n\nUse \`/play\` to add some ${EMOJIS.FIRE} tracks!`);
  } else {
    const queueList = queue.slice(0, 10).map((track, index) => {
      const trackInfo = getTrackInfo(track);
      const duration = trackInfo.isLive ? '🔴 Live' : (trackInfo.duration ? formatDuration(trackInfo.duration) : '0:00');
      return `\`${index + 1}.\` **${trackInfo.title}**\n   └ ${EMOJIS.MICROPHONE} ${trackInfo.author} • \`${duration}\``;
    }).join('\n\n');

    embed.setDescription(`${EMOJIS.QUEUE} **Up Next:**\n\n${queueList}`);

    if (queue.length > 10) {
      embed.setFooter({ 
        text: `${EMOJIS.SPARKLES} And ${queue.length - 10} more tracks in queue!` 
      });
    } else {
      embed.setFooter({ 
        text: `${EMOJIS.MUSICAL_NOTE} Total: ${queue.length} track${queue.length !== 1 ? 's' : ''} in queue` 
      });
    }
  }

  return embed;
}

export function createErrorEmbed(message, details = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setAuthor({ 
      name: 'Oops! Something went wrong',
      iconURL: 'https://cdn.discordapp.com/emojis/826577785784229918.png'
    })
    .setDescription(`${EMOJIS.ERROR} **${message}**`);
  
  if (details) {
    embed.addFields({ 
      name: '📝 Details', 
      value: `\`\`\`${details}\`\`\``,
      inline: false 
    });
  }
  
  embed.setFooter({ text: 'Need help? Check /help for available commands' })
    .setTimestamp();
  
  return embed;
}

export function createSuccessEmbed(title, message) {
  // If only one argument provided, use it as message with default title
  if (message === undefined) {
    message = title;
    title = 'Success!';
  }
  
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setAuthor({ 
      name: title,
      iconURL: 'https://cdn.discordapp.com/emojis/809085683849011210.png'
    })
    .setDescription(`${EMOJIS.SUCCESS} ${message}`)
    .setTimestamp();
}

export function createSearchResultEmbed(results, query) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setAuthor({ 
      name: 'Search Results',
      iconURL: 'https://cdn.discordapp.com/emojis/829650419752058921.gif'
    })
    .setTitle(`🔍 Results for: "${query}"`)
    .setDescription(
      results.slice(0, 5).map((track, index) => {
        const trackInfo = getTrackInfo(track);
        const duration = trackInfo.isLive ? '🔴 Live' : (trackInfo.duration ? formatDuration(trackInfo.duration) : '0:00');
        return `\`${index + 1}.\` **${trackInfo.title}**\n   └ ${EMOJIS.MICROPHONE} ${trackInfo.author} • \`${duration}\``;
      }).join('\n\n')
    )
    .setFooter({ text: `${EMOJIS.SPARKLES} Use /play <number> to select a track` })
    .setTimestamp();

  return embed;
}

export function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to extract track info from different formats
export function getTrackInfo(track) {
  // Lavalink format: track.info.title, track.info.author, track.info.length
  // play-dl format: track.title, track.author, track.duration
  
  // Check if it's a live stream
  const isLive = track?.info?.isStream || track?.isLive || false;
  
  // Duration: Lavalink uses 'length' in ms, play-dl uses 'duration' in ms
  let duration = 0;
  if (!isLive) {
    duration = track?.info?.length || track?.info?.duration || track?.duration || 0;
  }
  
  return {
    title: track?.info?.title || track?.title || 'Unknown Track',
    author: track?.info?.author || track?.author || 'Unknown Artist',
    duration: duration,
    isLive: isLive,
    uri: track?.info?.uri || track?.uri || track?.url || '',
    thumbnail: track?.info?.artworkUrl || track?.thumbnail || track?.artworkUrl || null,
    sourceName: track?.info?.sourceName || track?.sourceName || 'Unknown'
  };
}

export function createHelpEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setAuthor({ 
      name: 'Nabra Music Bot',
      iconURL: 'https://cdn.discordapp.com/emojis/741605543046807626.gif'
    })
    .setTitle(`${EMOJIS.HEADPHONES} Command Guide`)
    .setDescription(`**Welcome to Nabra Music Bot!** ${EMOJIS.SPARKLES}\n\nA powerful multi-source music bot with Lavalink support.\n`)
    .addFields(
      {
        name: `${EMOJIS.PLAY} Playback Commands`,
        value: [
          '> `/play <song>` - Play a track or add to queue',
          '> `/pause` - Pause the current track',
          '> `/resume` - Resume playback',
          '> `/skip` - Skip to the next track',
          '> `/previous` - Play the previous track'
        ].join('\n'),
        inline: false
      },
      {
        name: `${EMOJIS.QUEUE} Queue Commands`,
        value: [
          '> `/queue` - View the current queue',
          '> `/clear` - Clear the entire queue',
          '> `/shuffle` - Shuffle the queue',
          '> `/repeat <mode>` - Set repeat mode'
        ].join('\n'),
        inline: false
      },
      {
        name: `⏱️ Seek Commands`,
        value: [
          '> `/forward <seconds>` - Skip forward',
          '> `/backward <seconds>` - Skip backward'
        ].join('\n'),
        inline: false
      },
      {
        name: `${EMOJIS.RADIO} Supported Sources`,
        value: `${EMOJIS.FIRE} **YouTube** • **SoundCloud** • **Bandcamp** • **Twitch** • **Vimeo** • **HTTP Streams**`,
        inline: false
      }
    )
    .setFooter({ 
      text: `${EMOJIS.SPARKLES} Made with love • Nabra Music Bot v1.0`,
      iconURL: 'https://cdn.discordapp.com/emojis/809085683849011210.png'
    })
    .setTimestamp();
}
