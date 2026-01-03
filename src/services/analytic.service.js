const db = require('../configs/database');
const { sql, eq, and, gte, lte, desc } = require('drizzle-orm');
const { analytics } = require('../models/index');
const { generateTimeSeries } = require('../utils/date.helper');

// VIEW BY CONFIG
const VIEW_CONFIG = {
  hourly: {
    format: '%Y-%m-%d %H',
    ms: 1000 * 60 * 60,
    label: 'hour',
  },
  daily: {
    format: '%Y-%m-%d',
    ms: 1000 * 60 * 60 * 24,
    label: 'day',
  },
  weekly: {
    format: '%Y-%W',
    ms: 1000 * 60 * 60 * 24 * 7,
    label: 'week',
  },
  monthly: {
    format: '%Y-%m',
    label: 'month',
  },
};

// ALLOWED VIEW BY CONFIG
const ALLOWED_VIEW_BY = {
  today: ['hourly'],
  last_7_days: ['hourly', 'daily'],
  last_30_days: ['hourly', 'daily', 'weekly'],
  last_90_days: ['hourly', 'daily', 'weekly', 'monthly'],
  custom: ['hourly', 'daily', 'weekly', 'monthly'],
};

// GET ANALYTICS SUMMARY (TOTAL VISIT, PEAK TRAFFIC, TREND)
const getSummary = async (
  linkId,
  startDate,
  endDate,
  viewBy = 'daily',
  period
) => {
  const allowedViewBy = ALLOWED_VIEW_BY[period] || ALLOWED_VIEW_BY.custom;
  const effectiveViewBy = allowedViewBy.includes(viewBy)
    ? viewBy
    : allowedViewBy[0];
  const config = VIEW_CONFIG[effectiveViewBy];

  if (
    isNaN(new Date(startDate).getTime()) ||
    isNaN(new Date(endDate).getTime())
  ) {
    throw new AppError('Invalid date range provided.', 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInMs = end.getTime() - start.getTime();

  // hitung divisor
  const getDivisor = () => {
    if (
      effectiveViewBy === 'hourly' &&
      (period === 'today' || diffInMs < 86400000)
    ) {
      const hoursElapsed = diffInMs / (1000 * 60 * 60);

      return Math.max(Math.ceil(hoursElapsed), 1);
    }

    if (effectiveViewBy === 'monthly') {
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());

      return Math.max(months, 1); // minimal 1 agar hasil tidak infinity
    }

    return Math.max(Math.ceil(diffInMs / config.ms), 1);
  };

  const divisor = getDivisor();
  const prevStartDate = new Date(start.getTime() - diffInMs).toISOString();

  // get value total visits (concurrent execution untuk optimalisasi)
  const [currentReq, prevReq] = await Promise.all([
    db
      .select({ count: sql`count(*)` })
      .from(analytics)
      .where(
        and(
          eq(analytics.linkId, linkId),
          gte(analytics.accessedAt, startDate),
          lte(analytics.accessedAt, endDate)
        )
      ),
    db
      .select({ count: sql`count(*)` })
      .from(analytics)
      .where(
        and(
          eq(analytics.linkId, linkId),
          gte(analytics.accessedAt, prevStartDate),
          lte(analytics.accessedAt, startDate)
        )
      ),
  ]);

  const currentTotal = Number(currentReq[0].count);
  const prevTotal = Number(prevReq[0].count);

  // get trend logic
  const trendRaw =
    prevTotal > 0
      ? ((currentTotal - prevTotal) / prevTotal) * 100
      : currentTotal > 0
      ? 100
      : 0;

  // get value peak traffic
  const groupBySql = sql`strftime(${config.format}, ${analytics.accessedAt})`;
  const stats = await db
    .select({
      time: groupBySql,
      count: sql`count(*)`,
      rawSample: sql`MAX(${analytics.accessedAt})`,
    })
    .from(analytics)
    .where(
      and(
        eq(analytics.linkId, linkId),
        gte(analytics.accessedAt, startDate),
        lte(analytics.accessedAt, endDate)
      )
    )
    .groupBy(groupBySql)
    .orderBy(sql`${groupBySql} ASC`);

  let microGrowth = 0;

  if (stats.length >= 2) {
    // get 2 newest data dari list stats (stats sudah di-group by viewBy)
    const latestUnit = Number(stats[stats.length - 1].count);
    const previousUnit = Number(stats[stats.length - 2].count);

    if (previousUnit > 0) {
      microGrowth = ((latestUnit - previousUnit) / previousUnit) * 100;
    } else if (latestUnit > 0) {
      microGrowth = 100;
    }
  } else {
    // jika baru ada 1 unit waktu yang tercatat
    // dibandingkan dengan 0 (maka naik 100%)
    microGrowth = 100;
  }

  const peakRow =
    stats.length > 0
      ? [...stats].sort((a, b) => Number(b.count) - Number(a.count))[0]
      : null;

  // set value dari peak label by efective view by
  const getPeakLabel = (peakRow) => {
    if (!peakRow) return 'N/A';

    const peakDate = new Date(peakRow.rawSample);

    if (effectiveViewBy === 'monthly') {
      const months =
        (peakDate.getFullYear() - start.getFullYear()) * 12 +
        (peakDate.getMonth() - start.getMonth());
      return `Month ${months + 1}`;
    }

    const units = Math.floor(
      (peakDate.getTime() - start.getTime()) / config.ms
    );

    return `${config.label.charAt(0).toUpperCase() + config.label.slice(1)} ${
      units + 1
    }`;
  };

  return {
    total_visits: {
      current_period: currentTotal,
      average_per_unit: (currentTotal / divisor).toFixed(2),
      unit_label: config.label,
      percentage: Math.abs(microGrowth).toFixed(2),
      is_growing: microGrowth >= 0,
    },
    peak_traffic: {
      label: getPeakLabel(peakRow),
      value: Number(peakRow?.count || 0),
    },
    trend: {
      percentage: Math.abs(trendRaw).toFixed(2),
      status: trendRaw >= 0 ? 'Growing' : 'Dropping',
      label: `vs last ${Math.round(diffInMs / (1000 * 60 * 60 * 24))} days`,
    },
  };
};

// GET LOCATION DATA FOR PIE CHART & TABLE
const getLocation = async (linkId, startDate, endDate) => {
  // get data grouping per kota
  const results = await db
    .select({
      location: analytics.city,
      totalVisits: sql`count(*)`,
    })
    .from(analytics)
    .where(
      and(
        eq(analytics.linkId, linkId),
        gte(analytics.accessedAt, startDate),
        lte(analytics.accessedAt, endDate)
      )
    )
    .groupBy(analytics.city)
    .orderBy(desc(sql`count(*)`));

  if (results.length === 0) {
    return {
      table: [],
      chart: [],
    };
  }

  const totalVisitsInPeriod = results.reduce(
    (sum, row) => sum + Number(row.totalVisits),
    0
  );

  const top4 = results.slice(0, 4); // get 4 data teratas
  const remaining = results.slice(4); // sisa datanya

  // mapping data
  const formattedData = top4.map((item, index) => ({
    no: index + 1,
    location: item.location || 'Unknown',
    total_visits: Number(item.totalVisits),
    percentage: (
      (Number(item.totalVisits) / totalVisitsInPeriod) *
      100
    ).toFixed(2),
  }));

  // count data untuk kelompok others
  if (remaining.length > 0) {
    const othersCount = remaining.reduce(
      (sum, item) => sum + Number(item.totalVisits),
      0
    );
    formattedData.push({
      no: 5,
      location: 'Others',
      total_visits: othersCount,
      percentage: ((othersCount / totalVisitsInPeriod) * 100).toFixed(2),
    });
  }

  return {
    table: formattedData,
    chart: formattedData.map((d) => ({
      label: d.location,
      value: d.total_visits,
    })),
  };
};

// GET TIME SERIES DATA FOR LINE CHART
const getTimeSeries = async (linkId, startDate, endDate, viewBy) => {
  const config = VIEW_CONFIG[viewBy || 'daily'];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffInMs = end.getTime() - start.getTime();

  const prevStart = new Date(start.getTime() - diffInMs);
  const prevEnd = new Date(start.getTime() - 1);

  const groupBySql = sql`strftime(${config.format}, ${analytics.accessedAt})`;

  // get value total visits current & previous (concurrent execution untuk optimalisasi)
  const [currentRows, prevRows] = await Promise.all([
    db
      .select({ time: groupBySql, count: sql`count(*)` })
      .from(analytics)
      .where(
        and(
          eq(analytics.linkId, linkId),
          gte(analytics.accessedAt, startDate),
          lte(analytics.accessedAt, endDate)
        )
      )
      .groupBy(groupBySql),
    db
      .select({ time: groupBySql, count: sql`count(*)` })
      .from(analytics)
      .where(
        and(
          eq(analytics.linkId, linkId),
          gte(analytics.accessedAt, prevStart.toISOString()),
          lte(analytics.accessedAt, prevEnd.toISOString())
        )
      )
      .groupBy(groupBySql),
  ]);

  // generate slot waktu dari current period
  // data previous period hanya dimapping ke slot yang sama by label
  const currentSeries = generateTimeSeries(start, end, config, viewBy);

  // mapping data ke template
  const rowMap = new Map(currentRows.map((r) => [r.time, Number(r.count)]));
  const prevMap = new Map(prevRows.map((r) => [r.time, Number(r.count)]));

  return currentSeries.map((s) => ({
    display_label: s.label,
    current_period: rowMap.get(s.label) || 0,
    previous_period: prevMap.get(s.label) || 0,
  }));
};

module.exports = { getSummary, getLocation, getTimeSeries };
