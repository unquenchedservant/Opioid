const { Events } = require('discord.js');
const logger = require('../utility/logger');
const config = require('../utility/config');
const { botDeletes } = require('../utility/botDeletes');

// config.statusID is a status-indicator channel (its name reflects the /live toggle) --
// nobody should be posting there except specialUserID. Everyone else's messages get
// deleted immediately, bot's own messages excluded so it never fights itself.
module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (!config.modLogs) return;
    if (message.channelId !== config.modLogs) return;
    if (message.author.id === message.client.user.id) return;
    //if (message.author.id === config.specialUserID) return;

    try {
      botDeletes.add(message.id);
      await message.delete();
    }
    catch (error) {
      botDeletes.delete(message.id);
      logger.error(`Failed to delete message in status channel: ${error.stack || error}`);
    }
  },
};