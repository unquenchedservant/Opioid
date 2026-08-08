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
      .setDescription(`Message counts for all users across the last ${EPISODE_LIMIT} episodes`),
  );

module.exports = {
  data,
  async execute(interaction) {
    logger.info(`'/activity stats' was called by ${interaction.user.tag}`);

    const { episodeCount, rows } = await topMessagesCountDB.getStatsAcrossEpisodes(interaction.guildId, EPISODE_LIMIT);

    if (episodeCount === 0) {
      await interaction.reply({ content: 'No tracked episodes yet.', flags: MessageFlags.Ephemeral });
      return;
    }

    const averages = await topMessagesCountDB.getAllTimeAverages(interaction.guildId);

    let msg = `Activity across the last ${episodeCount} episode${episodeCount === 1 ? '' : 's'}:\n`;
    rows.forEach(({ userId, count }, index) => {
      const average = averages.get(userId).toFixed(1);
      msg += `${index + 1}. <@${userId}> — ${count} message${count === 1 ? '' : 's'} (avg ${average}/episode all-time)\n`;
    });

    await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
  },
};
