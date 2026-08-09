const { Events } = require('discord.js');
const logger = require('../utility/logger');
const config = require('../utility/config');

const GIF_URL = 'https://klipy.com/gifs/steak-69';

// Word-boundary match so "cowboy", "coward", etc. don't trigger it -- only "cow" on its own.
const COW_PATTERN = /\bcow\b/i;

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (message.channelId !== config.generalID) return;
    if (!COW_PATTERN.test(message.content)) return;

    try {
      await message.reply(GIF_URL);
    }
    catch (error) {
      logger.error(`Cow gif reply failed: ${error.stack || error}`);
    }
  },
};
