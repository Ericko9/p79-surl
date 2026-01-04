const AppError = require('./app-error.helper');

const getRange = (period, timezoneOffset = 0, customStart, customEnd) => {
  let start;
  let end;

  const getUserTodayStart = () => {
    const date = new Date();
    const userNow = new Date(date.getTime() - timezoneOffset * 60000);
    userNow.setUTCHours(0, 0, 0, 0);

    return new Date(userNow.getTime() + timezoneOffset * 60000);
  };

  const todayStart = getUserTodayStart();

  switch (period) {
    case 'today':
      start = todayStart;
      end = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    case 'last_7_days':
      start = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
      end = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    case 'last_30_days':
      start = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
      end = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    case 'last_90_days':
      start = new Date(todayStart.getTime() - 89 * 24 * 60 * 60 * 1000);
      end = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    case 'custom':
      if (!customStart || !customEnd)
        throw new Error('Custom range requires start & end');

      const s = new Date(`${customStart}T00:00:00Z`);
      start = new Date(s.getTime() + timezoneOffset * 60000);

      const e = new Date(`${customEnd}T23:59:59.999Z`);
      end = new Date(e.getTime() + timezoneOffset * 60000);
      break;

    default:
      throw new AppError('Invalid period', 400);
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
};

const formatLabel = (date, unit, timezoneOffset = 0) => {
  const pad = (n) => n.toString().padStart(2, '0');

  const localDate = new Date(date.getTime() - timezoneOffset * 60000);

  const y = localDate.getUTCFullYear();
  const m = pad(localDate.getUTCMonth() + 1);
  const d = pad(localDate.getUTCDate());
  const h = pad(localDate.getUTCHours());

  if (unit === 'hour') return `${y}-${m}-${d} ${h}`;
  if (unit === 'day') return `${y}-${m}-${d}`;
  if (unit === 'week') {
    const week = String(
      Math.floor(
        (Date.UTC(y, localDate.getUTCMonth(), localDate.getUTCDate()) -
          Date.UTC(y, 0, 1)) /
          86400000 /
          7
      )
    ).padStart(2, '0');

    return `${y}-${week}`;
  }
  if (unit === 'month') return `${y}-${m}`;

  return `${y}-${m}-${d}`;
};

const advanceDate = (date, viewBy) => {
  const d = new Date(date);

  if (viewBy === 'hourly') d.setUTCHours(d.getUTCHours() + 1);
  else if (viewBy === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (viewBy === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (viewBy === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCDate(d.getUTCDate() + 1);

  return d;
};

const generateTimeSeries = (start, end, config, viewBy, timezoneOffset = 0) => {
  const series = [];
  let current = new Date(start);
  const finish = new Date(end);

  let safetyCounter = 0;

  while (current <= finish && safetyCounter < 1000) {
    const label = formatLabel(current, config.label, timezoneOffset);
    series.push({ label, count: 0 });

    current = advanceDate(current, viewBy);
    safetyCounter++;
  }

  if (safetyCounter >= 1000) {
    console.warn('Warning: Time series loop reached safety limit!');
  }

  return series;
};

module.exports = { getRange, generateTimeSeries, formatLabel };
