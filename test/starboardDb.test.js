process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const { starboardDB, starboardSettingsDB } = require('../db/starboard');
const db = require('../db/database');

test.before(async () => {
  // See the comment in test/birthdayDb.test.js -- the constructors' CREATE TABLE calls
  // aren't awaited, so this guarantees both tables exist before any test runs.
  await Promise.all([starboardDB.create(), starboardSettingsDB.create()]);
});

test.after(async () => {
  await db.close();
});

test('StarboardSettingsDB: check is false until add() is called', async () => {
  const guildId = 'guild-settings-check';
  assert.equal(await starboardSettingsDB.check(guildId), false);

  await starboardSettingsDB.add(guildId, 'channel-1', 3);
  assert.equal(await starboardSettingsDB.check(guildId), true);
});

test('StarboardSettingsDB: getSettings/getThreshold/getChannel reflect what was added', async () => {
  const guildId = 'guild-settings-get';
  await starboardSettingsDB.add(guildId, 'channel-42', 5);

  const settings = await starboardSettingsDB.getSettings(guildId);
  assert.equal(settings.STARBOARDCHANNEL, 'channel-42');
  assert.equal(settings.STARBOARDTHRESHOLD, 5);
  assert.equal(await starboardSettingsDB.getThreshold(guildId), 5);
  assert.equal(await starboardSettingsDB.getChannel(guildId), 'channel-42');
});

test('StarboardSettingsDB: updateChannel/updateThreshold change an existing row', async () => {
  const guildId = 'guild-settings-update';
  await starboardSettingsDB.add(guildId, 'channel-old', 3);

  await starboardSettingsDB.updateChannel(guildId, 'channel-new');
  await starboardSettingsDB.updateThreshold(guildId, 7);

  const settings = await starboardSettingsDB.getSettings(guildId);
  assert.equal(settings.STARBOARDCHANNEL, 'channel-new');
  assert.equal(settings.STARBOARDTHRESHOLD, 7);
});

test('StarboardSettingsDB: remove deletes the row', async () => {
  const guildId = 'guild-settings-remove';
  await starboardSettingsDB.add(guildId, 'channel-1', 3);
  await starboardSettingsDB.remove(guildId);
  assert.equal(await starboardSettingsDB.check(guildId), false);
});

test('StarboardDB: check is false until add() is called', async () => {
  const msgId = 'msg-check';
  assert.equal(await starboardDB.check(msgId), false);

  await starboardDB.add(msgId, 'starboard-msg-1');
  assert.equal(await starboardDB.check(msgId), true);
});

test('StarboardDB: add/get round-trip the starboard message ID', async () => {
  const msgId = 'msg-get';
  await starboardDB.add(msgId, 'starboard-msg-2');
  assert.equal(await starboardDB.get(msgId), 'starboard-msg-2');
});

test('StarboardDB: update changes the starboard message ID for an existing entry', async () => {
  const msgId = 'msg-update';
  await starboardDB.add(msgId, 'starboard-msg-old');
  await starboardDB.update(msgId, 'starboard-msg-new');
  assert.equal(await starboardDB.get(msgId), 'starboard-msg-new');
});

test('StarboardDB: remove deletes the entry', async () => {
  const msgId = 'msg-remove';
  await starboardDB.add(msgId, 'starboard-msg-1');
  await starboardDB.remove(msgId);
  assert.equal(await starboardDB.check(msgId), false);
});

test('StarboardDB: get() on an unknown msgID currently throws rather than returning 0 -- ' +
  'pre-existing bug (`if (data)` in db/starboard.js is always true for an array, so ' +
  'data[0] is undefined and .STARBOARDMSGID throws). This test documents current behavior; ' +
  'if that check gets fixed to `if (data.length > 0)`, update this test to expect 0 instead.', async () => {
  await assert.rejects(() => starboardDB.get('msg-does-not-exist'), TypeError);
});
