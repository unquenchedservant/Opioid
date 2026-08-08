const { Events } = require('discord.js');
const logger = require('../utility/logger');
const config = require('../utility/config');

module.exports = {
  name: Events.MessageReactionAdd,
  once: false,
  async execute(reaction, user) {
    if (reaction.emoji.name !== '🖕') return;

    try {
      await reaction.message.react('❤️');
    }
    catch (error) {
      logger.error(`Heart reaction failed: ${error.stack || error}`);
    }
  },
};
