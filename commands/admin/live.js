const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { topMessagesSettingsDB } = require('../../db/topMessages');
const logger = require('../../utility/logger');

const data = new SlashCommandBuilder()
  .setName('live')
  .setDescription('Toggle or check whether tonight counts as a live show')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand(subcommand =>
    subcommand
      .setName('on')
      .setDescription('Mark tonight live -- tracking, channel rename, and announcements resume'),
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('off')
      .setDescription('Mark tonight not live (e.g. no show) -- suppresses show-night behavior'),
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('Check whether the show is currently marked live'),
  );

module.exports = {
  data,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`'/live ${subcommand}' was called by ${interaction.user.tag}`);

    if (subcommand === 'on' || subcommand === 'off') {
      const live = subcommand === 'on';
      await topMessagesSettingsDB.setEnabled(interaction.guildId, live);
      await interaction.reply({ content: `Live status set to ${live ? 'ON' : 'OFF'}.`, flags: MessageFlags.Ephemeral });
    }
    else if (subcommand === 'status') {
      const live = await topMessagesSettingsDB.isEnabled(interaction.guildId);
      await interaction.reply({ content: `Live status is currently ${live ? 'ON' : 'OFF'}.`, flags: MessageFlags.Ephemeral });
    }
  },
};
