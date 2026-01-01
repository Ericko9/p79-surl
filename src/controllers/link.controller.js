const linkService = require('../services/link.service');
const asyncHandler = require('express-async-handler');

/*  LINK MANAGEMENT
    1. Create Link
    2. Get My Links
    3. Get Link Detail
    4. Update Link
    5. Delete Link
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

  // call getUserLinks service
  const rawData = await linkService.getUserLinks(userId);

  // mapping response data
  const formattedData = rawData.map((link) => ({
    id: link.id,
    short_key: link.shortKey,
    redirect_uri: link.redirectUri,
    click_count: link.clickCount,
    created_at: link.createdAt,
  }));

  return res.status(200).json({
    status: true,
    data: formattedData,
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

module.exports = {
  createLink,
  getMyLinks,
  getLinkDetail,
  updateLink,
  deleteLink,
};
