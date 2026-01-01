const db = require('../configs/database');
const { eq, and, desc, ne } = require('drizzle-orm');
const { links, linkRules } = require('../models/index');
const crypto = require('crypto');
const { normalizeUrl } = require('../utils/link-formatter');
const {
  checkUrlValidity,
  validateKeyFormat,
} = require('../utils/link-validator');
const AppError = require('../utils/AppError');

// CREATE A NEW SHORT LINK
const createLink = async (userId, payload) => {
  const { url, customKey, rules } = payload;

  // cek field url
  if (!url) throw new AppError('URL is required!', 400);

  const normalizedUrl = normalizeUrl(url); // tambah https:// jika belum
  checkUrlValidity(normalizedUrl); // cek validitas url
  validateKeyFormat(customKey); // cek format key custom

  const key = customKey || crypto.randomBytes(4).toString('hex'); // atur key untuk short link

  // cek apakah short link sudah ada
  const existing = await db.query.links.findFirst({
    where: eq(links.shortKey, key),
  });

  if (existing) throw new AppError('Short key is already taken.', 409);

  return await db.transaction(async (tx) => {
    try {
      // insert data link ke tabel links
      const [newLink] = await tx
        .insert(links)
        .values({
          id: crypto.randomUUID(),
          userId,
          shortKey: key,
          redirectUri: normalizedUrl,
          isCustom: Boolean(customKey),
        })
        .returning();

      // default link rule
      const defaultRules = {
        expire_type: 'max-click',
        expire_date: null,
        max_click: 500,
      };

      // concate default dengan input user (if any)
      const finalRules = { ...defaultRules, ...rules };

      // insert data rule  ke tabel link_rules
      await tx.insert(linkRules).values({
        id: crypto.randomUUID(),
        linkId: newLink.id,
        expireType: finalRules.expire_type,
        expireDate: finalRules.expire_date,
        maxClick: finalRules.max_click,
      });

      return { ...newLink, rules: finalRules };
    } catch (error) {
      // jika terjadi error unik di db, transaksi dirollback
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new AppError('Short key is already taken.', 409);
      }

      if (error instanceof AppError) throw error;

      console.error(error.message);

      throw error;
    }
  });
};

// GET ALL USER LINK
const getUserLinks = async (userId) => {
  // cek field userId
  if (!userId) throw new AppError('User ID is Required!', 400);

  // get data daftar link dari db
  return await db
    .select({
      id: links.id,
      shortKey: links.shortKey,
      redirectUri: links.redirectUri,
      clickCount: links.clickCount,
      createdAt: links.createdAt,
    })
    .from(links)
    .where(eq(links.userId, userId))
    .orderBy(desc(links.createdAt));
};

// GET LINK DETAIL
const getLinkById = async (linkId, userId) => {
  // cek field id dan userId
  if (!linkId || !userId)
    throw new AppError('Link ID and User ID are required!', 400);

  try {
    // get data dari db
    const detail = await db.query.links.findFirst({
      where: and(eq(links.id, linkId), eq(links.userId, userId)),
      with: {
        rules: true, // with link rules
      },
    });

    if (!detail)
      throw new AppError('Link not found or you do not have permission.', 404);

    return detail;
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error(error.message);

    // error dari db, status 500
    throw new AppError('An error occurred while fetching link details.', 500);
  }
};

// UPDATE SHORT LINK DATA
const updateLink = async (linkId, userId, payload) => {
  const { url, customKey, rules } = payload;

  // cek field url, customKey, dan rules
  if (!url && !customKey && !rules)
    throw new AppError(
      'At least one field (url, custom_key, or rules) must be provided.',
      400
    );

  try {
    return await db.transaction(async (tx) => {
      const updateData = {};

      if (url) {
        const normalized = normalizeUrl(url); // tambah https:// jika belum
        checkUrlValidity(normalized); // cek validitas url

        updateData.redirectUri = normalized;
      }

      if (customKey) {
        validateKeyFormat(customKey); // cek format key custom

        // cek apakah short link sudah ada
        const existing = await tx.query.links.findFirst({
          where: and(eq(links.shortKey, customKey), ne(links.id, linkId)),
        });

        if (existing) throw new AppError('Short key is already taken.', 409);

        updateData.shortKey = customKey;
        updateData.isCustom = true;
      }

      if (Object.keys(updateData).length > 0) {
        // update data link di db
        const [updatedLink] = await tx
          .update(links)
          .set({
            ...updateData,
            updatedAt: new Date().toISOString(),
          })
          .where(and(eq(links.id, linkId), eq(links.userId, userId)))
          .returning();

        if (!updatedLink)
          throw new AppError('Link not found or unauthorized!', 404);
      } else {
        // cek ownership jika data link utama tidak diubah
        const existingLink = await tx.query.links.findFirst({
          where: and(eq(links.id, linkId), eq(links.userId, userId)),
        });

        if (!existingLink)
          throw new AppError('Link not found or unauthorized!', 404);
      }

      // jika update link rule (ada payload rules)
      if (rules) {
        const updateRulesData = {};

        if (rules.expire_type !== undefined)
          updateRulesData.expireType = rules.expire_type;

        if (rules.expire_date !== undefined)
          updateRulesData.expireDate = rules.expire_date;

        if (rules.max_click !== undefined)
          updateRulesData.maxClick = rules.max_click;

        // update data link rule di db
        if (Object.keys(updateRulesData).length > 0) {
          await tx
            .update(linkRules)
            .set({
              ...updateRulesData,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(linkRules.linkId, linkId));
        }
      }

      return await tx.query.links.findFirst({
        where: eq(links.id, linkId),
        with: { rules: true },
      });
    });
  } catch (error) {
    // jika terjadi error unik di db
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new AppError('Short key is already taken.', 409);
    }

    if (error instanceof AppError) throw error;

    console.error(error.message);

    throw error;
  }
};

// DELETE SHORT LINK DATA
const deleteLink = async (linkId, userId) => {
  // 1. Validasi input
  if (!linkId || !userId)
    throw new AppError('Link ID and User ID are required!', 400);

  // delete data link dari db
  const [deletedLink] = await db
    .delete(links)
    .where(and(eq(links.id, linkId), eq(links.userId, userId)))
    .returning();

  if (!deletedLink)
    throw new AppError(
      'Link not found or you do not have permission to delete it.',
      404
    );

  return deletedLink;
};

module.exports = {
  createLink,
  getUserLinks,
  getLinkById,
  updateLink,
  deleteLink,
};
