const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utility/logger');
const Scheduler = require('../utility/scheduler');
const config = require('../utility/config');
const birthdayDB = require('../db/birthday');

async function handleBirthday(client) {
  logger.info('Handling birthdays');
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const birthdayIDs = await birthdayDB.check(currentMonth, currentDay);
  let msg = '';
  if (birthdayIDs.length > 0) {
    logger.info('Birthdays found, making announcement post');
    msg = 'We\'ve got a birthday! Make sure to wish the following people a happy birthday:\n';
    for (const id of birthdayIDs) {
      msg += `<@${id}>\n`;
    }
    msg += '\nWant a message for your birthday? use `/birthday set`';
    const annCh = await client.channels.fetch(config.announcementsID);
	    await annCh.send({ content: msg });
  }
  else {
    logger.info(`No Birthdays for ${currentMonth}/${currentDay}`);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    const scheduler = new Scheduler(client);

    scheduler.scheduleDaily(async () => {
      await handleBirthday(client);
    }, '0 8 * * *');
  },
};