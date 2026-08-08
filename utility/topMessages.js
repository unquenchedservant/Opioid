// Timezone-aware helpers for the Friday/Saturday night "top chatters" feature.
// All date math goes through America/New_York wall-clock time (via Intl, not local Date
// getters/setters) so DST transitions and the host server's own timezone can't skew results.

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: 'numeric',
  hour12: false,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getETDateParts(date = new Date()) {
  return Object.fromEntries(DATE_FORMATTER.formatToParts(date).map(part => [part.type, part.value]));
}

// Tracking window is 9pm-12am ET on Fridays and Saturdays. Since the window never crosses
// midnight (it ends exactly at midnight), checking "today is Fri/Sat and hour >= 21" is sufficient.
function isTrackingWindow(date = new Date()) {
  const parts = DATE_TIME_FORMATTER.formatToParts(date);
  const weekday = parts.find(part => part.type === 'weekday').value;
  const hour = Number(parts.find(part => part.type === 'hour').value);
  return (weekday === 'Fri' || weekday === 'Sat') && hour >= 21;
}

function getETDateString(date = new Date()) {
  const { year, month, day } = getETDateParts(date);
  return `${year}-${month}-${day}`;
}

// Used by the monthly announcement, which fires just after midnight ET on the 1st and
// reports on the month that just ended.
function getETPreviousYearMonth(date = new Date()) {
  const { year, month } = getETDateParts(date);
  let y = Number(year);
  let m = Number(month) - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});

// Turns a "YYYY-MM" value (as produced by getETPreviousYearMonth) into a human label,
// e.g. "2026-07" -> "July 2026". Goes through a UTC noon timestamp so no timezone can
// shift it to the adjacent month/day -- only the month/year label is ever read back out.
function getMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  return MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

const EPISODE_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

// Turns a MSGDATE value ("YYYY-MM-DD") into a short display label, e.g. "2026-08-07" ->
// "Aug 7", for the /activity stats per-episode table. Goes through UTC (not America/New_York)
// since MSGDATE is already the resolved ET calendar date -- reparsing it in ET could shift
// it a day depending on the host's clock.
function formatEpisodeDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return EPISODE_DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
}

// Shared brand color for the "top chatters" feature's embeds (nightly/monthly
// announcements and /activity stats), so they read as one consistent feature.
const TOP_MESSAGES_COLOR = 0xF5A623;

module.exports = { isTrackingWindow, getETDateString, getETPreviousYearMonth, getMonthLabel, formatEpisodeDate, TOP_MESSAGES_COLOR };
