const { eq, and } = require('drizzle-orm');
const { links } = require('../models/link.model');
const db = require('../configs/database');

module.exports = async function linkOwnership(req, res, next) {
  try {
    // get id
    const userId = req.user.id;
    const linkId = req.params.id;

    if (!linkId) return res.status(400).json({ message: 'Link ID required' });

    // cek user id dan link id
    const link = await db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.id, linkId), eq(links.userId, userId)))
      .limit(1);

    if (link.length === 0) {
      return res.status(403).json({
        status: false,
        message: 'You do not own this link.',
      });
    }

    next();
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: 'Internal Server Error' });
  }
};
