const { Events } = require('discord.js');
const logger = require('../utility/logger');
const Scheduler = require('../utility/scheduler');
const config = require('../utility/config');
const { isTrackingWindow } = require('../utility/topMessages');
const { topMessagesSettingsDB } = require('../db/topMessages');

const EPISODE_NAME = 'episode-discussion';
const DEFAULT_NAME = 'general';

// The channel rename fires an hour ahead of the 9pm message-tracking window (see
// utility/topMessages.js#isTrackingWindow), so the name flips before the show actually starts.
const CHANNEL_NAME_START_HOUR = 20;

// Renames the general channel to reflect whether we're in the Friday/Saturday 8pm-midnight
// ET episode window, unless tonight's been marked not-live via /live off -- in that case it
// always resolves to "general", same as if we were outside the window entirely. Only calls
// the Discord API when the name actually needs to change, since channel renames are rate-limited.
async function syncChannelName(client) {
  try {
    const channel = await client.channels.fetch(config.generalID);
    const isLive = await topMessagesSettingsDB.isEnabled(config.guildID);
    const inWindow = isTrackingWindow(new Date(), CHANNEL_NAME_START_HOUR);
    const targetName = isLive && inWindow ? EPISODE_NAME : DEFAULT_NAME;

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

    // Start of the episode window -- an hour ahead of message tracking.
    scheduler.scheduleDaily(async () => {
      await syncChannelName(client);
    }, '0 20 * * 5,6', { timezone: 'America/New_York' });

    // End of the window -- midnight rolling into Saturday (after Friday's window) or Sunday
    // (after Saturday's window).
    scheduler.scheduleDaily(async () => {
      await syncChannelName(client);
    }, '0 0 * * 6,0', { timezone: 'America/New_York' });
  },
};
