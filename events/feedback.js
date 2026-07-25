const { Events } = require('discord.js');
const logger = require('../utility/logger');
const config = require('../utility/config');

const GIF_LOCATIONS = ["https://tenor.com/view/late-night-seth-lnsm-lnsmgi-fs-seth-meyers-paper-shredder-gif-9199043", "https://tenor.com/view/andersomviolao-gif-12381443319241980618", "https://tenor.com/view/suggestion-brick-wall-discord-mod-bleebus-mollusk-gif-19186065", "https://tenor.com/view/trash-garbage-shoot-trash-can-gif-16464801", "https://tenor.com/view/trash-fail-gif-26874517"];
const MESSAGES = ["Hmm, interesting idea!", "We'll get right on that!", "Wow, thank you so much for this suggestion", "You are a valued member of this server."];

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (message.channelId !== config.feedbackID) return;

    try {
      const gif = GIF_LOCATIONS[Math.floor(Math.random() * GIF_LOCATIONS.length)];
      const reply = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      await message.reply(`${reply}\n${gif}`);
    }
    catch (error) {
      logger.error(`Feedback reply failed: ${error.stack || error}`);
    }
  },
};