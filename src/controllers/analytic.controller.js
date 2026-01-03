const analyticsService = require('../services/analytic.service');
const { getRange } = require('../utils/date.helper');
const asyncHandler = require('express-async-handler');

/*  ANALYTIC MANAGEMENT
    1. Get Analytic Summary
    2. Get Locations
    3. Get Time Series
*/

const getSummary = asyncHandler(async (req, res) => {
  const { link_id: linkId } = req.params;
  const {
    period = 'last_7_days',
    view_by: viewBy,
    custom_start: customStart,
    custom_end: customEnd,
  } = req.query;

  // get value dari range tanggal berdasarkan filter
  const { startDate, endDate } = getRange(period, customStart, customEnd);

  // call getSummary service
  const summary = await analyticsService.getSummary(
    linkId,
    startDate,
    endDate,
    viewBy,
    period
  );

  res.json({
    status: true,
    data: summary,
  });
});

const getLocation = asyncHandler(async (req, res) => {
  const { link_id: linkId } = req.params;
  const {
    period = 'last_7_days',
    custom_start: customStart,
    custom_end: customEnd,
  } = req.query;

  // get value dari range tanggal berdasarkan filter
  const { startDate, endDate } = getRange(period, customStart, customEnd);

  // call getLocation service
  const locations = await analyticsService.getLocation(
    linkId,
    startDate,
    endDate
  );

  res.status(200).json({
    status: true,
    data: {
      ...locations,
    },
  });
});

const getTimeSeries = asyncHandler(async (req, res) => {
  const { link_id: linkId } = req.params;
  const {
    period = 'last_7_days',
    view_by: viewBy,
    custom_start: customStart,
    custom_end: customEnd,
  } = req.query;

  // get value dari range tanggal berdasarkan filter
  const { startDate, endDate } = getRange(period, customStart, customEnd);

  // call getTimeSeries service (sudah menangani zero-filling dan compare data)
  const chartData = await analyticsService.getTimeSeries(
    linkId,
    startDate,
    endDate,
    viewBy
  );

  res.status(200).json({
    status: true,
    data: chartData,
  });
});

module.exports = { getSummary, getLocation, getTimeSeries };
