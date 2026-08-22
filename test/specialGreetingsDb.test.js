process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const specialGreetingsDB = require('../db/specialGreetings');
const db = require('../db/database');

test.before(async () => {
  // See the comment in test/birthdayDb.test.js -- the constructor's CREATE TABLE isn't
  // awaited, so this guarantees the table exists before any test runs.
  await specialGreetingsDB.create();
});

test.after(async () => {
  await db.close();
});

test('markGreetedIfFirst: true on the first message of the night, false on repeats', async () => {
  const guildId = 'guild-greetings';
  const userId = 'user-a';
  const date = '2026-08-21';

  assert.equal(await specialGreetingsDB.markGreetedIfFirst(guildId, userId, date), true);
  assert.equal(await specialGreetingsDB.markGreetedIfFirst(guildId, userId, date), false);
  assert.equal(await specialGreetingsDB.markGreetedIfFirst(guildId, userId, date), false);
});

test('markGreetedIfFirst: resets to true on a different tracked night', async () => {
  const guildId = 'guild-greetings';
  const userId = 'user-a';

  await specialGreetingsDB.markGreetedIfFirst(guildId, userId, '2026-08-21');
  assert.equal(await specialGreetingsDB.markGreetedIfFirst(guildId, userId, '2026-08-22'), true);
});

test('markGreetedIfFirst: tracked independently per user', async () => {
  const guildId = 'guild-greetings-multiuser';
  const date = '2026-08-21';

  assert.equal(await specialGreetingsDB.markGreetedIfFirst(guildId, 'user-a', date), true);
  assert.equal(await specialGreetingsDB.markGreetedIfFirst(guildId, 'user-b', date), true);
  assert.equal(await specialGreetingsDB.markGreetedIfFirst(guildId, 'user-a', date), false);
});
