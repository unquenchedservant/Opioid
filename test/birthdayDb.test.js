process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const birthdayDB = require('../db/birthday');
const db = require('../db/database');

test.before(async () => {
  // BirthdayDB's constructor kicks off CREATE TABLE IF NOT EXISTS without awaiting it, so
  // the first query in this file can otherwise race ahead of table creation. create() is
  // safe to re-run (IF NOT EXISTS), so awaiting it here just guarantees ordering.
  await birthdayDB.create();
});

test.after(async () => {
  await db.close();
});

test('get: returns "no_birthday" for a user with no row', async () => {
  assert.equal(await birthdayDB.get('user-unset'), 'no_birthday');
});

test('set/get: round-trips month, day, and defaults ACTIVE to 1', async () => {
  const userId = 'user-set';
  await birthdayDB.set(userId, 6, 15);

  const row = await birthdayDB.get(userId);
  assert.equal(row.MONTH, 6);
  assert.equal(row.DAY, 15);
  assert.equal(row.ACTIVE, 1);
});

test('set: calling it again on the same user updates in place rather than duplicating', async () => {
  const userId = 'user-update-inplace';
  await birthdayDB.set(userId, 6, 15);
  await birthdayDB.set(userId, 12, 25);

  const row = await birthdayDB.get(userId);
  assert.equal(row.MONTH, 12);
  assert.equal(row.DAY, 25);

  // Confirm there's exactly one row for this user (an update), not two (an extra insert).
  // Deliberately not using check() here -- it matches on month/day across *all* users, so
  // it isn't a reliable way to prove a single user's row didn't duplicate.
  const rawDb = await db.connect();
  const rows = await new Promise((resolve, reject) => {
    rawDb.all('SELECT * FROM birthdays WHERE USERID=?', [userId], (err, r) => (err ? reject(err) : resolve(r)));
  });
  assert.equal(rows.length, 1);
});

test('check: returns userIds with a birthday on that month/day', async () => {
  await birthdayDB.set('user-checkA', 3, 10);
  await birthdayDB.set('user-checkB', 3, 10);
  // different month, should not match
  await birthdayDB.set('user-checkC', 4, 10);

  const ids = await birthdayDB.check(3, 10);
  assert.deepEqual(ids.sort(), ['user-checkA', 'user-checkB']);
});

test('setActive: false excludes a user from check(), true (or the pre-existing default) includes them', async () => {
  const userId = 'user-active';
  await birthdayDB.set(userId, 5, 5);
  await birthdayDB.setActive(false, userId);
  assert.deepEqual(await birthdayDB.check(5, 5), []);

  await birthdayDB.setActive(true, userId);
  assert.deepEqual(await birthdayDB.check(5, 5), [userId]);
});

test('getMulti: includes every user with a birthday set', async () => {
  await birthdayDB.set('user-multiA', 7, 4);
  await birthdayDB.set('user-multiB', 7, 4);

  const all = await birthdayDB.getMulti();
  assert.ok(all.includes('user-multiA'));
  assert.ok(all.includes('user-multiB'));
});

test('remove: deletes the row so get() falls back to "no_birthday"', async () => {
  const userId = 'user-remove';
  await birthdayDB.set(userId, 1, 1);
  await birthdayDB.remove(userId);
  assert.equal(await birthdayDB.get(userId), 'no_birthday');
});
