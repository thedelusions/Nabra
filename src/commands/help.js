import { SlashCommandBuilder } from 'discord.js';
import { createHelpEmbed } from '../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display help information and available commands'),

  async execute(interaction) {
    const helpEmbed = createHelpEmbed();
    await interaction.reply({ embeds: [helpEmbed] });
  }
};
