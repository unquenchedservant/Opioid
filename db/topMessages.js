const logger = require('../utility/logger');
const db = require('./database');

const DEFAULT_DISPLAY_COUNT = 5;

class TopMessagesSettingsDB {
  constructor() {
    this.create();
  }

  async create() {
    logger.info('Checking/creating topmessagesettings table');
    await db.execute(`CREATE TABLE IF NOT EXISTS topmessagesettings
            (GUILDID TEXT NOT NULL,
            ENABLED INTEGER NOT NULL,
            DISPLAYCOUNT INTEGER)`);
    await this.migrateDisplayCountColumn();
  }

  // topmessagesettings originally shipped without DISPLAYCOUNT. CREATE TABLE IF NOT EXISTS
  // won't add it to a table that already exists, so patch it in here. Checks first rather
  // than attempting the ALTER and swallowing a "duplicate column" error, since that error
  // would otherwise get logged by db.execute() on every single startup after the first.
  async migrateDisplayCountColumn() {
    const rawDb = await db.connect();
    const columns = await new Promise((resolve, reject) => {
      rawDb.all('PRAGMA table_info(topmessagesettings)', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    if (!columns.some(column => column.name === 'DISPLAYCOUNT')) {
      logger.info('Migrating topmessagesettings table: adding DISPLAYCOUNT column');
      await db.execute('ALTER TABLE topmessagesettings ADD COLUMN DISPLAYCOUNT INTEGER');
    }
  }

  async isEnabled(guildId) {
    logger.info(`Checking if top messages announcement is enabled for guild ID #${guildId}`);
    const data = await db.execute('SELECT ENABLED FROM topmessagesettings WHERE GUILDID=?', [guildId]);
    return data.length === 0 ? true : data[0].ENABLED === 1;
  }

  async setEnabled(guildId, enabled) {
    logger.info(`Setting top messages announcement to ${enabled} for guild ID #${guildId}`);
    const enabledInt = enabled ? 1 : 0;
    const data = await db.execute('SELECT * FROM topmessagesettings WHERE GUILDID=?', [guildId]);
    if (data.length === 0) {
      await db.execute('INSERT INTO topmessagesettings (GUILDID, ENABLED) VALUES (?, ?)', [guildId, enabledInt]);
    }
    else {
      await db.execute('UPDATE topmessagesettings SET ENABLED=? WHERE GUILDID=?', [enabledInt, guildId]);
    }
  }

  async getDisplayCount(guildId) {
    logger.info(`Getting top messages display count for guild ID #${guildId}`);
    const data = await db.execute('SELECT DISPLAYCOUNT FROM topmessagesettings WHERE GUILDID=?', [guildId]);
    return data.length === 0 || data[0].DISPLAYCOUNT === null ? DEFAULT_DISPLAY_COUNT : data[0].DISPLAYCOUNT;
  }

  async setDisplayCount(guildId, count) {
    logger.info(`Setting top messages display count to ${count} for guild ID #${guildId}`);
    const data = await db.execute('SELECT * FROM topmessagesettings WHERE GUILDID=?', [guildId]);
    if (data.length === 0) {
      await db.execute('INSERT INTO topmessagesettings (GUILDID, ENABLED, DISPLAYCOUNT) VALUES (?, 1, ?)', [guildId, count]);
    }
    else {
      await db.execute('UPDATE topmessagesettings SET DISPLAYCOUNT=? WHERE GUILDID=?', [count, guildId]);
    }
  }
}

// One row per (guild, user, night). MSGDATE is the ET calendar date ('YYYY-MM-DD') of the
// tracking window the message fell in -- see utility/topMessages.js#getETDateString.
class TopMessagesCountDB {
  constructor() {
    this.create();
  }

  async create() {
    logger.info('Checking/creating topmessagecounts table');
    await db.execute(`CREATE TABLE IF NOT EXISTS topmessagecounts
            (GUILDID TEXT NOT NULL,
            USERID TEXT NOT NULL,
            MSGDATE TEXT NOT NULL,
            MSGCOUNT INTEGER NOT NULL)`);
  }

  async increment(guildId, userId, date) {
    const data = await db.execute('SELECT MSGCOUNT FROM topmessagecounts WHERE GUILDID=? AND USERID=? AND MSGDATE=?', [guildId, userId, date]);
    if (data.length === 0) {
      await db.execute('INSERT INTO topmessagecounts (GUILDID, USERID, MSGDATE, MSGCOUNT) VALUES (?, ?, ?, 1)', [guildId, userId, date]);
    }
    else {
      await db.execute('UPDATE topmessagecounts SET MSGCOUNT=MSGCOUNT+1 WHERE GUILDID=? AND USERID=? AND MSGDATE=?', [guildId, userId, date]);
    }
  }

  async getTopForDate(guildId, date, limit) {
    logger.info(`Getting top ${limit} chatters for guild ID #${guildId} on ${date}`);
    const data = await db.execute(`SELECT USERID, MSGCOUNT FROM topmessagecounts
            WHERE GUILDID=? AND MSGDATE=? ORDER BY MSGCOUNT DESC LIMIT ?`, [guildId, date, limit]);
    return data.map(row => ({ userId: row.USERID, count: row.MSGCOUNT }));
  }

  async getTopForMonth(guildId, yearMonth, limit) {
    logger.info(`Getting top ${limit} chatters for guild ID #${guildId} for ${yearMonth}`);
    const data = await db.execute(`SELECT USERID, SUM(MSGCOUNT) AS TOTAL FROM topmessagecounts
            WHERE GUILDID=? AND MSGDATE LIKE ? GROUP BY USERID ORDER BY TOTAL DESC LIMIT ?`, [guildId, `${yearMonth}%`, limit]);
    return data.map(row => ({ userId: row.USERID, count: row.TOTAL }));
  }

  // Sums message counts for a single user across the most recent `episodeLimit` tracked nights
  // (distinct MSGDATE values), not calendar nights -- so a Friday with no messages, or one
  // that was disabled, just doesn't count as an episode. Returns fewer than episodeLimit
  // episodes if that many aren't in the database yet.
  async getStatsForUser(guildId, userId, episodeLimit) {
    logger.info(`Getting activity stats for user ID #${userId} across the last ${episodeLimit} episodes for guild ID #${guildId}`);
    const dates = await db.execute(`SELECT DISTINCT MSGDATE FROM topmessagecounts
            WHERE GUILDID=? ORDER BY MSGDATE DESC LIMIT ?`, [guildId, episodeLimit]);

    if (dates.length === 0) {
      return { episodeCount: 0, count: 0 };
    }

    const dateValues = dates.map(row => row.MSGDATE);
    const placeholders = dateValues.map(() => '?').join(',');
    const data = await db.execute(`SELECT SUM(MSGCOUNT) AS TOTAL FROM topmessagecounts
            WHERE GUILDID=? AND USERID=? AND MSGDATE IN (${placeholders})`,
    [guildId, userId, ...dateValues]);

    return {
      episodeCount: dates.length,
      count: data[0].TOTAL || 0,
    };
  }

  // All-time (not episode-limited) average messages per episode participated in, for one user.
  async getAllTimeAverageForUser(guildId, userId) {
    logger.info(`Getting all-time average for user ID #${userId} in guild ID #${guildId}`);
    const data = await db.execute(`SELECT SUM(MSGCOUNT) AS TOTAL, COUNT(DISTINCT MSGDATE) AS EPISODES
            FROM topmessagecounts WHERE GUILDID=? AND USERID=?`, [guildId, userId]);
    return data[0].EPISODES > 0 ? data[0].TOTAL / data[0].EPISODES : 0;
  }
}

module.exports = {
  topMessagesSettingsDB: new TopMessagesSettingsDB(),
  topMessagesCountDB: new TopMessagesCountDB(),
};
