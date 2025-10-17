import { SlashCommandBuilder } from 'discord.js';
import play from 'play-dl';
import { getAnghamiMeta } from '../../utils/anghami.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play music from YouTube, SoundCloud, or Anghami link')
  .addStringOption(opt => opt
    .setName('query')
    .setDescription('Song name or link')
    .setRequired(true));

export async function execute(interaction) {
  await interaction.deferReply();
  const query = interaction.options.getString('query');
  let song = query;

  if (query.includes('anghami.com')) {
    const meta = await getAnghamiMeta(query);
    song = `${meta.artist} - ${meta.title}`;
  }

  const search = await play.search(song, { limit: 1, source: { youtube: 'video' }});
  if (!search[0]) return interaction.editReply('❌ Song not found.');

  const stream = await play.stream(search[0].url);
  const connection = joinVoiceChannel({
    channelId: interaction.member.voice.channel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  const resource = createAudioResource(stream.stream, { inputType: stream.type });
  connection.subscribe(player);
  player.play(resource);

  interaction.editReply(`🎶 Now Playing: **${search[0].title}**`);
}
