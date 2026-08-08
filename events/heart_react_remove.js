const { Events } = require('discord.js');
const logger = require('../utility/logger');

module.exports = {
  name: Events.MessageReactionRemove,
  once: false,
  async execute(reaction) {
    if (reaction.emoji.name !== '🖕') return;

    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.count > 0) return;

      await reaction.message.reactions.cache.get('❤️')?.users.remove();
    }
    catch (error) {
      logger.error(`Heart reaction removal failed: ${error.stack || error}`);
    }
  },
};
