const { Events } = require('discord.js');
const { syncStatusChannelName } = require('../utility/statusChannel');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    // Covers a bot restart where the /live toggle changed, or the channel got renamed,
    // while the bot was offline.
    syncStatusChannelName(client);
  },
};
