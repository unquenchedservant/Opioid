const { Events } = require('discord.js');
const logger = require('../utility/logger');
const config = require('../utility/config');
const { isTrackingWindow, getETDateString } = require('../utility/topMessages');
const specialGreetingsDB = require('../db/specialGreetings');

const GIF_URL = 'https://klipy.com/gifs/dropout-game-changers';

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.id !== config.specialUserID) return;
    if (message.channelId !== config.generalID) return;
    if (!isTrackingWindow()) return;

    try {
      const isFirstTonight = await specialGreetingsDB.markGreetedIfFirst(message.guildId, message.author.id, getETDateString());
      if (!isFirstTonight) return;

      await message.reply(GIF_URL);
    }
    catch (error) {
      logger.error(`Special user greeting failed: ${error.stack || error}`);
    }
  },
};
