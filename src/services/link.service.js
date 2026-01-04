const db = require('../configs/database');
const { sql, eq, and, desc, ne, like, gte, lte } = require('drizzle-orm');
const { links, linkRules, linkQrCodes, analytics } = require('../models/index');
const crypto = require('crypto');
const { normalizeUrl } = require('../utils/link-formatter.helper');
const {
  checkUrlValidity,
  validateKeyFormat,
} = require('../utils/link-validator.helper');
const { randomUUID } = require('node:crypto');
const QRCode = require('qrcode');
const cloudinary = require('../configs/storage');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const AppError = require('../utils/app-error.helper');

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
        expire_type: 'max_click',
        expire_date: null,
        max_click: 200,
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
const getUserLinks = async (userId, filters = {}) => {
  // cek field userId
  if (!userId) throw new AppError('User ID is Required!', 400);

  // cek filter
  const { page = 1, limit = 10, search, startDate, endDate } = filters;
  const offset = (page - 1) * limit;

  // kondisi query dinamis
  const conditions = [eq(links.userId, userId)];

  if (search) {
    conditions.push(like(links.shortKey, `%${search}%`)); // find by shortKey
  }

  if (startDate && endDate) {
    conditions.push(
      and(gte(links.createdAt, startDate), lte(links.createdAt, endDate))
    ); // find by date
  }

  // get data dengan limit dan offset dari db
  const data = await db
    .select()
    .from(links)
    .where(and(...conditions))
    .orderBy(desc(links.createdAt))
    .limit(limit)
    .offset(offset);

  // count total data untuk pagination
  const totalCount = await db
    .select({ count: sql`count(*)` })
    .from(links)
    .where(and(...conditions));

  return {
    data,
    pagination: {
      total_data: totalCount[0].count,
      total_pages: Math.ceil(totalCount[0].count / limit),
      current_page: parseInt(page),
      limit: limit,
    },
  };
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
        qrCode: true, // with qr codes
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
      const oldLink = await tx.query.links.findFirst({
        where: and(eq(links.id, linkId), eq(links.userId, userId)),
        with: { qrCode: true },
      });

      if (!oldLink) throw new AppError('Link not found!', 404);

      const updateData = {};
      let qrDeleted = false;

      if (url) {
        const normalized = normalizeUrl(url); // tambah https:// jika belum
        checkUrlValidity(normalized); // cek validitas url

        updateData.redirectUri = normalized;
      }

      if (customKey && customKey !== oldLink.shortKey) {
        validateKeyFormat(customKey); // cek format key custom

        // cek apakah short link sudah ada
        const existing = await tx.query.links.findFirst({
          where: and(eq(links.shortKey, customKey), ne(links.id, linkId)),
        });

        if (existing) throw new AppError('Short key is already taken.', 409);

        updateData.shortKey = customKey;
        updateData.isCustom = true;

        if (oldLink.qrCode) {
          // hapus data qr di db
          await tx.delete(linkQrCodes).where(eq(linkQrCodes.linkId, linkId));
          qrDeleted = true;
        }
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

        if (rules.expire_type === 'max_click') {
          updateRulesData.expireType = 'max_click';
          updateRulesData.maxClick = rules.max_click;
          updateRulesData.expireDate = null;
        } else if (rules.expire_type === 'expire_date') {
          updateRulesData.expireType = 'expire_date';
          updateRulesData.expireDate = rules.expire_date;
          updateRulesData.maxClick = null;
        }

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

      if (qrDeleted) {
        // hapus qr di storage jika ada
        cloudinary.uploader
          .destroy(`shortlink_qr/qr_${oldLink.shortKey}`)
          .catch((err) =>
            console.warn('Cloudinary cleanup skipped:', err.message)
          );
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

// GET REDIRECT URL
const getRedirectUrl = async (shortKey) => {
  // get link dengan link rule
  const link = await db.query.links.findFirst({
    where: eq(links.shortKey, shortKey),
    with: {
      rules: true, // with link rule
    },
  });

  if (!link) {
    throw new AppError('Short link not found.', 404);
  }

  // validasi rules
  const rules = link.rules;
  if (rules) {
    // validasi max click (type expire = max_click)
    if (rules.expireType === 'max_click') {
      if (link.clickCount >= rules.maxClick) {
        throw new AppError(
          'This link has reached its maximum click limit.',
          410
        );
      }
    }

    // validasi expire date (type expire = expire_date)
    if (rules.expireType === 'expire_date') {
      if (rules.expireDate && new Date() > new Date(rules.expireDate)) {
        throw new AppError('This link has expired.', 410);
      }
    }
  }

  // update click count di db
  await db
    .update(links)
    .set({
      clickCount: sql`${links.clickCount} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(links.id, link.id));

  return link;
};

// RECORD ANALYTICS DATA
const recordAnalytics = async (
  linkId,
  { ip, userAgent, referrer, cityHeader }
) => {
  let cityName = cityHeader;

  if (!cityName || cityName === 'Unknown') {
    const geo = geoip.lookup(ip);
    cityName = geo ? geo.city : 'Unknown';
  }

  // parser data untuk mengambil browser dan os
  const parser = new UAParser(userAgent);
  const ua = parser.getResult();

  // insert analytic data ke db
  await db.insert(analytics).values({
    id: crypto.randomUUID(),
    linkId: linkId,
    ipAddress: ip,
    browser: ua.browser.name || 'Unknown',
    os: ua.os.name || 'Unknown',
    referrer: referrer || 'Direct',
    city: cityName,
    accessedAt: new Date().toISOString(),
  });
};

// GENERATE QR CODE
const generateQrCode = async (userId, linkId) => {
  // find link di db (link harus exist)
  const [linkData] = await db
    .select()
    .from(links)
    .where(and(eq(links.id, linkId), eq(links.userId, userId)))
    .limit(1);

  if (!linkData) throw new AppError('Link not found or unauthorized', 404);

  // cek apakah qr sudah pernah dibuat
  const [existingQr] = await db
    .select()
    .from(linkQrCodes)
    .where(eq(linkQrCodes.linkId, linkId))
    .limit(1);

  if (existingQr) {
    return {
      image_path: existingQr.imagePath,
      is_generated: existingQr.isGenerated,
      created_at: existingQr.createdAt,
    };
  }

  // generate qr & Upload image
  const fullUrl = `${process.env.BASE_URL}/${linkData.shortKey}`;
  const qrBase64 = await QRCode.toDataURL(fullUrl);

  const uploadRes = await cloudinary.uploader.upload(qrBase64, {
    folder: 'shortlink_qr',
    public_id: `qr_${linkData.shortKey}`,
  });

  // insert data ke db
  const [insertedQr] = await db
    .insert(linkQrCodes)
    .values({
      id: randomUUID(),
      linkId,
      imagePath: uploadRes.secure_url,
      isGenerated: true,
    })
    .returning();

  return {
    image_path: insertedQr.imagePath,
    is_generated: insertedQr.isGenerated,
    created_at: insertedQr.createdAt,
  };
};

// GET QR CODE
const getQrByLinkId = async (linkId) => {
  // get data QR
  const qrData = await db.query.linkQrCodes.findFirst({
    where: eq(linkQrCodes.linkId, linkId),
  });

  if (!qrData)
    throw new AppError('QR Code not generated yet for this link.', 404);

  return qrData;
};

module.exports = {
  createLink,
  getUserLinks,
  getLinkById,
  updateLink,
  deleteLink,
  getRedirectUrl,
  recordAnalytics,
  generateQrCode,
  getQrByLinkId,
};
