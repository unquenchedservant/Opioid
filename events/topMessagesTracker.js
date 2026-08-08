const { Events } = require('discord.js');
const logger = require('../utility/logger');
const config = require('../utility/config');
const { isTrackingWindow, getETDateString } = require('../utility/topMessages');
const { topMessagesSettingsDB, topMessagesCountDB } = require('../db/topMessages');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (message.channelId !== config.generalID) return;
    if (!isTrackingWindow()) return;

    try {
      if (!await topMessagesSettingsDB.isEnabled(message.guildId)) return;
      await topMessagesCountDB.increment(message.guildId, message.author.id, getETDateString());
    }
    catch (error) {
      logger.error(`Top messages tracking failed: ${error.stack || error}`);
    }
  },
};
