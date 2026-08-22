const logger = require('../utility/logger');
const db = require('./database');

// One row per (guild, user, night) once that user's been sent the showtime greeting --
// prevents a duplicate reply if the bot restarts mid-episode. MSGDATE is the ET calendar
// date of the tracking window, matching topmessagecounts (see utility/topMessages.js#getETDateString).
class SpecialGreetingsDB {
  constructor() {
    this.create();
  }

  async create() {
    logger.info('Checking/creating specialgreetings table');
    await db.execute(`CREATE TABLE IF NOT EXISTS specialgreetings
            (GUILDID TEXT NOT NULL,
            USERID TEXT NOT NULL,
            MSGDATE TEXT NOT NULL)`);
  }

  // Returns true and records the greeting if this is the first time tonight, false if
  // userId was already greeted -- so the caller only replies once per showtime.
  async markGreetedIfFirst(guildId, userId, date) {
    const data = await db.execute('SELECT 1 FROM specialgreetings WHERE GUILDID=? AND USERID=? AND MSGDATE=?', [guildId, userId, date]);
    if (data.length > 0) return false;

    await db.execute('INSERT INTO specialgreetings (GUILDID, USERID, MSGDATE) VALUES (?, ?, ?)', [guildId, userId, date]);
    return true;
  }
}

module.exports = new SpecialGreetingsDB();
