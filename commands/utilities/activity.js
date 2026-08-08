const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { topMessagesCountDB } = require('../../db/topMessages');
const logger = require('../../utility/logger');

const EPISODE_LIMIT = 10;

const data = new SlashCommandBuilder()
  .setName('activity')
  .setDescription('Chat activity stats')
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription(`Your message counts across the last ${EPISODE_LIMIT} episodes`),
  );

module.exports = {
  data,
  async execute(interaction) {
    logger.info(`'/activity stats' was called by ${interaction.user.tag}`);

    const { episodeCount, count } = await topMessagesCountDB.getStatsForUser(interaction.guildId, interaction.user.id, EPISODE_LIMIT);

    if (episodeCount === 0) {
      await interaction.reply({ content: 'No tracked episodes yet.', flags: MessageFlags.Ephemeral });
      return;
    }

    const average = (await topMessagesCountDB.getAllTimeAverageForUser(interaction.guildId, interaction.user.id)).toFixed(1);

    const msg = `Your activity across the last ${episodeCount} episode${episodeCount === 1 ? '' : 's'}: ${count} message${count === 1 ? '' : 's'} (avg ${average}/episode all-time)`;

    await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
  },
};
