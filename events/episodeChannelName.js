const { Events } = require('discord.js');
const logger = require('../utility/logger');
const Scheduler = require('../utility/scheduler');
const config = require('../utility/config');
const { isTrackingWindow } = require('../utility/topMessages');

const EPISODE_NAME = 'episode-discussion';
const DEFAULT_NAME = 'general';

// Renames the general channel to reflect whether we're in the Friday/Saturday 9pm-midnight
// ET tracking window (see utility/topMessages.js#isTrackingWindow). Only calls the Discord
// API when the name actually needs to change, since channel renames are rate-limited.
async function syncChannelName(client) {
  try {
    const channel = await client.channels.fetch(config.generalID);
    const targetName = isTrackingWindow() ? EPISODE_NAME : DEFAULT_NAME;

    if (channel.name === targetName) return;

    logger.info(`Renaming general channel to "${targetName}"`);
    await channel.setName(targetName);
  }
  catch (error) {
    logger.error(`Failed to sync general channel name: ${error.stack || error}`);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    // Covers a bot restart landing mid-window, when the next cron trigger could be hours away.
    syncChannelName(client);

    const scheduler = new Scheduler(client);

    // Start of the tracking window.
    scheduler.scheduleDaily(async () => {
      await syncChannelName(client);
    }, '0 21 * * 5,6', { timezone: 'America/New_York' });

    // End of the window -- midnight rolling into Saturday (after Friday's window) or Sunday
    // (after Saturday's window).
    scheduler.scheduleDaily(async () => {
      await syncChannelName(client);
    }, '0 0 * * 6,0', { timezone: 'America/New_York' });
  },
};
