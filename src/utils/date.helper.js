const getRange = (period, customStart, customEnd) => {
  const now = new Date();
  let start;
  let end;

  const todayUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  switch (period) {
    case 'today':
      start = todayUTC;
      end = new Date(todayUTC);
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'last_7_days':
      start = new Date(todayUTC);
      start.setUTCDate(start.getUTCDate() - 6);
      end = new Date(todayUTC);
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'last_30_days':
      start = new Date(todayUTC);
      start.setUTCDate(start.getUTCDate() - 29);
      end = new Date(todayUTC);
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'last_90_days':
      start = new Date(todayUTC);
      start.setUTCDate(start.getUTCDate() - 89);
      end = new Date(todayUTC);
      end.setUTCHours(23, 59, 59, 999);
      break;

    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom range requires start & end');
      }
      start = new Date(`${customStart}T00:00:00.000Z`);
      end = new Date(`${customEnd}T23:59:59.999Z`);
      break;

    default:
      throw new Error('Invalid period');
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
};

const formatLabel = (date, unit) => {
  const pad = (n) => n.toString().padStart(2, '0');

  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());

  if (unit === 'hour') return `${y}-${m}-${d} ${h}`;
  if (unit === 'day') return `${y}-${m}-${d}`;
  if (unit === 'week') {
    const week = String(
      Math.floor(
        (Date.UTC(y, date.getUTCMonth(), date.getUTCDate()) -
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

  return d;
};

const generateTimeSeries = (start, end, config, viewBy) => {
  const series = [];
  let current = new Date(start);
  const finish = new Date(end);

  while (current <= finish) {
    const label = formatLabel(current, config.label);
    series.push({ label, count: 0 });

    current = advanceDate(current, viewBy);
  }

  return series;
};

module.exports = { getRange, generateTimeSeries };
