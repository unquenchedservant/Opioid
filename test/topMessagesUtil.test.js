const test = require('node:test');
const assert = require('node:assert/strict');
const { isTrackingWindow, getETDateString, getETPreviousYearMonth, getMonthLabel, formatEpisodeDate } = require('../utility/topMessages');

// Builds a UTC instant for a given America/New_York wall-clock time. offsetHours is the ET
// UTC offset for that date -- 4 for EDT (roughly Mar-Nov), 5 for EST (roughly Nov-Mar).
// Passed explicitly per call rather than derived, so these tests don't depend on a
// timezone library agreeing with Intl about DST transition dates.
function etInstant(year, month, day, hour, minute, offsetHours) {
  return new Date(Date.UTC(year, month - 1, day, hour + offsetHours, minute));
}

test('isTrackingWindow: Friday just before 9pm ET is not in the window', () => {
  assert.equal(isTrackingWindow(etInstant(2026, 8, 21, 20, 59, 4)), false);
});

test('isTrackingWindow: Friday at 9pm ET is in the window', () => {
  assert.equal(isTrackingWindow(etInstant(2026, 8, 21, 21, 0, 4)), true);
});

test('isTrackingWindow: Friday at 11:59pm ET is in the window', () => {
  assert.equal(isTrackingWindow(etInstant(2026, 8, 21, 23, 59, 4)), true);
});

test('isTrackingWindow: Saturday at 9pm ET is in the window', () => {
  assert.equal(isTrackingWindow(etInstant(2026, 8, 22, 21, 0, 4)), true);
});

test('isTrackingWindow: Sunday at 9pm ET is not in the window', () => {
  assert.equal(isTrackingWindow(etInstant(2026, 8, 23, 21, 0, 4)), false);
});

test('isTrackingWindow: Wednesday at 9pm ET is not in the window', () => {
  assert.equal(isTrackingWindow(etInstant(2026, 8, 19, 21, 0, 4)), false);
});

test('isTrackingWindow: honors a custom startHour independent of the 9pm default', () => {
  assert.equal(isTrackingWindow(etInstant(2026, 8, 21, 20, 0, 4), 20), true);
  assert.equal(isTrackingWindow(etInstant(2026, 8, 21, 19, 59, 4), 20), false);
});

test('getETDateString: formats an ET wall-clock date as YYYY-MM-DD', () => {
  assert.equal(getETDateString(etInstant(2026, 8, 21, 22, 0, 4)), '2026-08-21');
});

test('getETDateString: a late-UTC instant that is still "yesterday" in ET', () => {
  // 2026-08-22 02:00 UTC is 2026-08-21 10:00pm EDT -- still the previous calendar day in ET.
  assert.equal(getETDateString(new Date('2026-08-22T02:00:00Z')), '2026-08-21');
});

test('getETPreviousYearMonth: normal case within the same year', () => {
  assert.equal(getETPreviousYearMonth(etInstant(2026, 8, 1, 0, 5, 4)), '2026-07');
});

test('getETPreviousYearMonth: rolls back across a year boundary', () => {
  assert.equal(getETPreviousYearMonth(etInstant(2026, 1, 1, 0, 5, 5)), '2025-12');
});

test('getMonthLabel: turns a YYYY-MM value into a human label', () => {
  assert.equal(getMonthLabel('2026-07'), 'July 2026');
});

test('getMonthLabel: correct across a year boundary', () => {
  assert.equal(getMonthLabel('2025-12'), 'December 2025');
});

test('formatEpisodeDate: turns a MSGDATE value into a short label', () => {
  assert.equal(formatEpisodeDate('2026-08-07'), 'Aug 7');
});

test('formatEpisodeDate: does not roll the day back near a UTC boundary', () => {
  assert.equal(formatEpisodeDate('2026-01-01'), 'Jan 1');
});
