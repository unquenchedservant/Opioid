const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, Message } = require('discord.js');
const logger = require('../../utility/logger');
const config = require('../../utility/config');

const data = new SlashCommandBuilder()
  .setName('vcto')
  .setDescription('Add or remove a user from VC timeout')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a user to VC Timeout')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to timeout from VC')
          .setRequired(true),
      ),
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a user from VC Timeout')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to remove from VC Timeout')
          .setRequired(true),
      ),
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('check')
      .setDescription('Check if a user is in timeout')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to check status of VC Timeout')
          .setRequired(true),
      )
  );

module.exports = {
    data,
    async execute(interaction) {
        if (interaction.channelId != config.staffBotCommandID){
            interaction.reply({ content: 'Please use this command in the staff #bot-cmds channel', flags: MessageFlags.Ephemeral });
            return 0;
        }
        const member = interaction.options.getMember('user');
        const role = interaction.guild.roles.cache.get(config.vcMuteRoleID)
        if (interaction.options.getSubcommand() === 'add'){
            logger.info(`'/vcTimeout add' was called by ${interaction.user.tag} on ${member.displayName}`)
            member.roles.add(role)
            interaction.reply({ content: `Successfully timed out ${member.displayName}`})
        }else if (interaction.options.getSubcommand() === 'remove'){
            logger.info(`'/vcTimeout add' was called by ${interaction.user.tag} on ${member.displayName}`)
            member.roles.remove(role)
            interaction.reply({ content: `Successfully removed ${member.displayName} from timeout`})
        }else if (interaction.options.getSubcommand() === 'check'){
            logger.info(`'/vcTimeout check' was called by ${interaction.user.tag} on ${member.displayName}`)
            if (member.roles.cache.has(config.vcMuteRoleID)){
                interaction.reply({ content: `${member.displayName} is timed out`})
            } else {
                interaction.reply({ content: `${member.displayName} is not timed out`})
            }
        }
    },
};