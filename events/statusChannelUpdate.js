const { Events } = require('discord.js');
const config = require('../utility/config');
const { syncStatusChannelName } = require('../utility/statusChannel');

// Someone with Manage Channels can rename config.statusID by hand at any time (accidentally
// or otherwise) -- this catches that and snaps it back to whatever /live currently says it
// should be. Safe from feedback loops: syncStatusChannelName's own corrective rename lands
// exactly on the target name, so the ChannelUpdate it triggers is a no-op on the next pass.
module.exports = {
  name: Events.ChannelUpdate,
  once: false,
  async execute(oldChannel, newChannel) {
    if (!config.statusID) return;
    if (newChannel.id !== config.statusID) return;
    if (oldChannel.name === newChannel.name) return;

    await syncStatusChannelName(newChannel.client);
  },
};
