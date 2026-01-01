const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { links } = require('./link.model');

// definisi tabel 'link_qr_codes'
const linkQrCodes = sqliteTable('link_qr_codes', {
  id: text('id').primaryKey(),
  linkId: text('link_id')
    .notNull()
    .unique()
    .references(() => links.id, { onDelete: 'cascade' }),
  imagePath: text('image_path'),
  format: text('format').default('png'),
  isGenerated: integer('is_generated', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

module.exports = { linkQrCodes };
