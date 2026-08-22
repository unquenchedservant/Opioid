process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const { topMessagesSettingsDB, topMessagesCountDB } = require('../db/topMessages');
const db = require('../db/database');

test.before(async () => {
  // See the comment in test/birthdayDb.test.js -- the constructors' CREATE TABLE calls
  // aren't awaited, so this guarantees both tables exist before any test runs.
  await Promise.all([topMessagesSettingsDB.create(), topMessagesCountDB.create()]);
});

test.after(async () => {
  await db.close();
});

test('TopMessagesSettingsDB: isEnabled defaults to true for a guild with no row', async () => {
  assert.equal(await topMessagesSettingsDB.isEnabled('guild-settings-default'), true);
});

test('TopMessagesSettingsDB: setEnabled/isEnabled round-trip, including flipping an existing row', async () => {
  const guildId = 'guild-settings-toggle';
  await topMessagesSettingsDB.setEnabled(guildId, false);
  assert.equal(await topMessagesSettingsDB.isEnabled(guildId), false);

  await topMessagesSettingsDB.setEnabled(guildId, true);
  assert.equal(await topMessagesSettingsDB.isEnabled(guildId), true);
});

test('TopMessagesSettingsDB: getDisplayCount defaults to 5 for a guild with no row', async () => {
  assert.equal(await topMessagesSettingsDB.getDisplayCount('guild-display-default'), 5);
});

test('TopMessagesSettingsDB: setDisplayCount/getDisplayCount round-trip', async () => {
  const guildId = 'guild-display-set';
  await topMessagesSettingsDB.setDisplayCount(guildId, 8);
  assert.equal(await topMessagesSettingsDB.getDisplayCount(guildId), 8);
});

test('TopMessagesSettingsDB: migrates DISPLAYCOUNT onto a pre-existing table that lacks it', async () => {
  // Simulates the schema as it existed before DISPLAYCOUNT was added, to lock in the fix
  // described in db/topMessages.js#migrateDisplayCountColumn (proactive column check instead
  // of swallowing a "duplicate column" error on every startup).
  const rawDb = await db.connect();
  await new Promise((resolve, reject) => {
    rawDb.run('DROP TABLE IF EXISTS topmessagesettings', (err) => (err ? reject(err) : resolve()));
  });
  await new Promise((resolve, reject) => {
    rawDb.run('CREATE TABLE topmessagesettings (GUILDID TEXT NOT NULL, ENABLED INTEGER NOT NULL)', (err) => (err ? reject(err) : resolve()));
  });

  await topMessagesSettingsDB.migrateDisplayCountColumn();

  const columns = await new Promise((resolve, reject) => {
    rawDb.all('PRAGMA table_info(topmessagesettings)', [], (err, rows) => (err ? reject(err) : resolve(rows)));
  });
  assert.ok(columns.some(column => column.name === 'DISPLAYCOUNT'));

  // Restore the table other tests in this file expect.
  await topMessagesSettingsDB.create();
});

test('TopMessagesCountDB: increment creates a row, then accumulates on repeat calls', async () => {
  const guildId = 'guild-count-increment';
  await topMessagesCountDB.increment(guildId, 'user-a', '2026-08-21');
  await topMessagesCountDB.increment(guildId, 'user-a', '2026-08-21');
  await topMessagesCountDB.increment(guildId, 'user-a', '2026-08-21');

  const top = await topMessagesCountDB.getTopForDate(guildId, '2026-08-21', 5);
  assert.deepEqual(top, [{ userId: 'user-a', count: 3 }]);
});

test('TopMessagesCountDB: getTopForDate sorts descending and respects the limit', async () => {
  const guildId = 'guild-count-topfordate';
  const date = '2026-08-21';
  await topMessagesCountDB.increment(guildId, 'user-low', date);
  for (let i = 0; i < 3; i++) await topMessagesCountDB.increment(guildId, 'user-mid', date);
  for (let i = 0; i < 5; i++) await topMessagesCountDB.increment(guildId, 'user-high', date);

  const top = await topMessagesCountDB.getTopForDate(guildId, date, 2);
  assert.deepEqual(top, [
    { userId: 'user-high', count: 5 },
    { userId: 'user-mid', count: 3 },
  ]);
});

test('TopMessagesCountDB: getTopForMonth sums across dates in the month and ignores other months', async () => {
  const guildId = 'guild-count-topformonth';
  for (let i = 0; i < 2; i++) await topMessagesCountDB.increment(guildId, 'user-a', '2026-08-07');
  for (let i = 0; i < 3; i++) await topMessagesCountDB.increment(guildId, 'user-a', '2026-08-14');
  // different month, should not count
  await topMessagesCountDB.increment(guildId, 'user-a', '2026-09-01');

  const top = await topMessagesCountDB.getTopForMonth(guildId, '2026-08', 5);
  assert.deepEqual(top, [{ userId: 'user-a', count: 5 }]);
});

test('TopMessagesCountDB: getEpisodeBreakdownForUser zero-fills nights the user did not post', async () => {
  const guildId = 'guild-count-breakdown';
  // Establish 3 guild-wide tracked nights via another user, so the window exists even on
  // nights our test user was silent.
  await topMessagesCountDB.increment(guildId, 'other-user', '2026-08-01');
  await topMessagesCountDB.increment(guildId, 'other-user', '2026-08-08');
  await topMessagesCountDB.increment(guildId, 'other-user', '2026-08-08');

  for (let i = 0; i < 5; i++) await topMessagesCountDB.increment(guildId, 'user-a', '2026-08-01');
  // user-a posted nothing on 2026-08-08

  const breakdown = await topMessagesCountDB.getEpisodeBreakdownForUser(guildId, 'user-a', 10);
  assert.deepEqual(breakdown, [
    { date: '2026-08-08', count: 0 },
    { date: '2026-08-01', count: 5 },
  ]);
});

test('TopMessagesCountDB: getEpisodeBreakdownForUser returns an empty array when the guild has no tracked nights', async () => {
  const breakdown = await topMessagesCountDB.getEpisodeBreakdownForUser('guild-count-empty', 'user-a', 10);
  assert.deepEqual(breakdown, []);
});

test('TopMessagesCountDB: getAllTimeAverageForUser averages only over nights the user participated in', async () => {
  const guildId = 'guild-count-alltime';
  for (let i = 0; i < 5; i++) await topMessagesCountDB.increment(guildId, 'user-a', '2026-08-01');
  for (let i = 0; i < 3; i++) await topMessagesCountDB.increment(guildId, 'user-a', '2026-08-07');
  // user-a silent this night, must not count as a 0 in the average
  await topMessagesCountDB.increment(guildId, 'other-user', '2026-08-14');

  // (5 + 3) / 2
  assert.equal(await topMessagesCountDB.getAllTimeAverageForUser(guildId, 'user-a'), 4);
});

test('TopMessagesCountDB: getAllTimeAverageForUser is 0 for a user with no messages', async () => {
  assert.equal(await topMessagesCountDB.getAllTimeAverageForUser('guild-count-alltime', 'never-posted'), 0);
});
