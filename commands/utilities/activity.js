const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { topMessagesCountDB } = require('../../db/topMessages');
const { formatEpisodeDate, TOP_MESSAGES_COLOR } = require('../../utility/topMessages');
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

    const breakdown = await topMessagesCountDB.getEpisodeBreakdownForUser(interaction.guildId, interaction.user.id, EPISODE_LIMIT);

    if (breakdown.length === 0) {
      await interaction.reply({ content: 'No tracked episodes yet.', flags: MessageFlags.Ephemeral });
      return;
    }

    const total = breakdown.reduce((sum, { count }) => sum + count, 0);
    const average = (await topMessagesCountDB.getAllTimeAverageForUser(interaction.guildId, interaction.user.id)).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor(TOP_MESSAGES_COLOR)
      .setTitle('📊 Your Activity')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`Across your last ${breakdown.length} episode${breakdown.length === 1 ? '' : 's'}, you sent **${total}** message${total === 1 ? '' : 's'} total.`)
      .addFields(
        { name: 'Episode', value: breakdown.map(({ date }) => `\`${formatEpisodeDate(date)}\``).join('\n'), inline: true },
        { name: 'Messages', value: breakdown.map(({ count }) => `\`${count}\``).join('\n'), inline: true },
        { name: 'All-time average', value: `${average} messages/episode`, inline: false },
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
