const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { topMessagesSettingsDB } = require('../../db/topMessages');
const logger = require('../../utility/logger');

const data = new SlashCommandBuilder()
  .setName('topmessages')
  .setDescription('Configure the top chatters announcements')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand(subcommand =>
    subcommand
      .setName('setcount')
      .setDescription('Set how many users show up in the nightly/monthly top chatters lists')
      .addIntegerOption(option =>
        option
          .setName('count')
          .setDescription('Number of users to display (default 5)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(25),
      ),
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('getcount')
      .setDescription('Get how many users currently show up in the top chatters lists'),
  );

module.exports = {
  data,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`'/topmessages ${subcommand}' was called by ${interaction.user.tag}`);

    if (subcommand === 'setcount') {
      const count = interaction.options.getInteger('count');
      await topMessagesSettingsDB.setDisplayCount(interaction.guildId, count);
      await interaction.reply({ content: `Top chatters lists will now show ${count} user${count === 1 ? '' : 's'}.`, flags: MessageFlags.Ephemeral });
    }
    else if (subcommand === 'getcount') {
      const count = await topMessagesSettingsDB.getDisplayCount(interaction.guildId);
      await interaction.reply({ content: `Top chatters lists currently show ${count} user${count === 1 ? '' : 's'}.`, flags: MessageFlags.Ephemeral });
    }
  },
};
