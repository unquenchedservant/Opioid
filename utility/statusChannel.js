const logger = require('./logger');
const config = require('./config');
const { topMessagesSettingsDB } = require('../db/topMessages');

const LIVE_NAME = 'live';
const NOT_LIVE_NAME = 'not-live';

// Renames config.statusID to reflect the current /live toggle (topMessagesSettingsDB.isEnabled),
// independent of the Friday/Saturday tracking window -- this is a plain on/off indicator, not
// tied to show hours the way episodeChannelName.js is. No-ops if statusID isn't configured yet
// (e.g. prod, until that channel exists) or the name already matches, since renames are rate-limited.
async function syncStatusChannelName(client) {
  if (!config.statusID) return;

  try {
    const channel = await client.channels.fetch(config.statusID);
    const isLive = await topMessagesSettingsDB.isEnabled(config.guildID);
    const targetName = isLive ? LIVE_NAME : NOT_LIVE_NAME;

    if (channel.name === targetName) return;

    logger.info(`Renaming status channel to "${targetName}"`);
    await channel.setName(targetName);
  }
  catch (error) {
    logger.error(`Failed to sync status channel name: ${error.stack || error}`);
  }
}

module.exports = { syncStatusChannelName, LIVE_NAME, NOT_LIVE_NAME };
