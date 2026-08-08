const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utility/logger');
const Scheduler = require('../utility/scheduler');
const config = require('../utility/config');
const { getETDateString, getETPreviousYearMonth, getMonthLabel, TOP_MESSAGES_COLOR } = require('../utility/topMessages');
const { topMessagesSettingsDB, topMessagesCountDB } = require('../db/topMessages');

const MEDALS = ['🥇', '🥈', '🥉'];

function buildLeaderboardEmbed(title, rows) {
  const description = rows.map(({ userId, count }, index) => {
    const rank = MEDALS[index] ?? `**${index + 1}.**`;
    return `${rank} <@${userId}> — ${count} message${count === 1 ? '' : 's'}`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(TOP_MESSAGES_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'Want to see your own stats? Use /activity stats' })
    .setTimestamp();
}

async function handleNightlyAnnounce(client) {
  logger.info('Handling nightly top messages announcement');

  if (!await topMessagesSettingsDB.isEnabled(config.guildID)) {
    logger.info('Top messages announcement is disabled, skipping');
    return;
  }

  const displayCount = await topMessagesSettingsDB.getDisplayCount(config.guildID);
  const top = await topMessagesCountDB.getTopForDate(config.guildID, getETDateString(), displayCount);
  if (top.length === 0) {
    logger.info('No messages tracked tonight, skipping top messages announcement');
    return;
  }

  const annCh = await client.channels.fetch(config.announcementsID);
  await annCh.send({ embeds: [buildLeaderboardEmbed('🌙 Tonight\'s Top Chatters', top)] });
}

async function handleMonthlyAnnounce(client) {
  logger.info('Handling monthly top messages announcement');

  const displayCount = await topMessagesSettingsDB.getDisplayCount(config.guildID);
  const yearMonth = getETPreviousYearMonth();
  const top = await topMessagesCountDB.getTopForMonth(config.guildID, yearMonth, displayCount);
  if (top.length === 0) {
    logger.info('No messages tracked last month, skipping monthly top messages announcement');
    return;
  }

  const annCh = await client.channels.fetch(config.announcementsID);
  await annCh.send({ embeds: [buildLeaderboardEmbed(`🏆 ${getMonthLabel(yearMonth)}'s Top Chatters`, top)] });
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    const scheduler = new Scheduler(client);

    // Fires at 11:59pm ET only on Fridays (5) and Saturdays (6) -- the tail end of the
    // 9pm-12am tracking window from utility/topMessages.js.
    scheduler.scheduleDaily(async () => {
      await handleNightlyAnnounce(client);
    }, '59 23 * * 5,6', { timezone: 'America/New_York' });

    // Fires just after midnight ET on the 1st of each month, reporting on the month that
    // just ended. Not gated by the enable/disable toggle -- that only suppresses a single
    // night's tracking/announcement (e.g. "no show tonight"), not the whole feature.
    scheduler.scheduleDaily(async () => {
      await handleMonthlyAnnounce(client);
    }, '5 0 1 * *', { timezone: 'America/New_York' });
  },
};
