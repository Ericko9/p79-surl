const linkService = require('../services/link.service');
const asyncHandler = require('express-async-handler');

/*  LINK MANAGEMENT
    1. Create Link
    2. Get My Links
    3. Get Link Detail
    4. Update Link
    5. Delete Link
    6. Handle Redirect
    7. Generate QR
*/

const createLink = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? null;
  const { redirect_uri: url, custom_key: customKey, rules } = req.body;

  // call createLink service
  const data = await linkService.createLink(userId, {
    url,
    customKey,
    rules,
  });

  return res.status(201).json({
    status: true,
    data: {
      id: data.id,
      user_id: data.userId,
      short_key: data.shortKey,
      redirect_uri: data.redirectUri,
      is_custom: data.isCustom,
      click_count: data.clickCount,
      created_at: data.createdAt,
      rules: data.rules,
    },
  });
});

const getMyLinks = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // get field page, search,, startDate, dan endDate
  const { page, search, startDate, endDate } = req.query;

  // call getUserLinks service
  const rawData = await linkService.getUserLinks(userId, {
    page: parseInt(page) || 1,
    limit: 10,
    search,
    startDate,
    endDate,
  });

  // mapping response data
  const formattedData = rawData.data.map((link) => ({
    id: link.id,
    short_key: link.shortKey,
    redirect_uri: link.redirectUri,
    click_count: link.clickCount,
    created_at: link.createdAt,
  }));

  return res.status(200).json({
    status: true,
    data: formattedData,
    pagination: rawData.pagination, // metadata pagination
  });
});

const getLinkDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // call getLinkById service
  const data = await linkService.getLinkById(id, userId);

  return res.status(200).json({
    status: true,
    data: {
      id: data.id,
      short_key: data.shortKey,
      redirect_uri: data.redirectUri,
      is_custom: data.isCustom,
      click_count: data.clickCount,
      created_at: data.createdAt,
      rules: {
        expire_type: data.rules.expireType,
        expire_date: data.rules.expireDate,
        max_click: data.rules.maxClick,
      },
      qr_code: data.qrCode
        ? {
            image_path: data.qrCode.imagePath,
            format: data.qrCode.format,
          }
        : null,
    },
  });
});

const updateLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { redirect_uri: url, custom_key: customKey, rules } = req.body;

  // call updateLink service
  const data = await linkService.updateLink(id, userId, {
    url,
    customKey,
    rules,
  });

  return res.status(200).json({
    status: true,
    message: 'Link updated successfully',
    data: {
      id: data.id,
      short_key: data.shortKey,
      redirect_uri: data.redirectUri,
      is_custom: data.isCustom,
      click_count: data.clickCount,
      updated_at: data.updatedAt,
      rules: {
        expire_type: data.rules.expireType,
        expire_date: data.rules.expireDate,
        max_click: data.rules.maxClick,
      },
    },
  });
});

const deleteLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // call deleteLink service
  await linkService.deleteLink(id, userId);

  return res.status(200).json({
    status: true,
    message: 'Link deleted successfully',
  });
});

const redirect = asyncHandler(async (req, res) => {
  const { shortKey } = req.params;

  // get metadata dari request
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const referrer = req.headers['referer'] || null;
  const cityHeader = req.headers['x-vercel-ip-city'];

  // call getRedirectUrl service
  const link = await linkService.getRedirectUrl(shortKey);

  // insert data analytics di background
  linkService
    .recordAnalytics(link.id, { ip, userAgent, referrer, cityHeader })
    .catch((err) => {
      console.error('Failed to record analytics:', err);
    });

  res.redirect(link.redirectUri);
});

const generateQr = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const linkId = req.params.id;

  // call generateQrCode service
  const qrData = await linkService.generateQrCode(userId, linkId);

  return res.status(200).json({
    status: true,
    data: {
      is_generated: true,
      image: qrData.image_path,
      generated_at: qrData.created_at,
    },
  });
});

const getQrDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const qrData = await linkService.getQrByLinkId(id);

  // membuat url download
  const downloadUrl = qrData.imagePath.replace(
    '/upload/',
    '/upload/fl_attachment/'
  );

  return res.status(200).json({
    status: true,
    data: {
      image_path: qrData.imagePath,
      download_url: downloadUrl,
      format: qrData.format,
      is_generated: qrData.isGenerated,
      created_at: qrData.createdAt,
    },
  });
});

module.exports = {
  createLink,
  getMyLinks,
  getLinkDetail,
  updateLink,
  deleteLink,
  redirect,
  generateQr,
  getQrDetail,
};
