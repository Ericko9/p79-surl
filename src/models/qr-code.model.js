const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { links } = require('./link.model');

// Definisi tabel 'link_qr_codes'
const linkQrCodes = sqliteTable('link_qr_codes', {
  id: text('id').primaryKey(),
  linkId: text('link_id')
    .notNull()
    .unique()
    .references(() => links.id, { onDelete: 'cascade' }),
  imagePath: text('image_path'),
  format: text('format').default('png'),
  isGenerated: integer('is_generated', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

module.exports = { linkQrCodes };
