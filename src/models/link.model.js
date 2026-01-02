const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { relations } = require('drizzle-orm');
const { users } = require('./user.model');

// definisi tabel 'links'
const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  shortKey: text('short_key').notNull().unique(),
  redirectUri: text('redirect_uri').notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).default(false),
  clickCount: integer('click_count').default(0),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

module.exports = { links };

const { linkRules } = require('./rule.model');
const { linkQrCodes } = require('./qr-code.model');

// tambah mapping ke linkRules
const linksRelations = relations(links, ({ one }) => ({
  // relasi 1 to 1
  rules: one(linkRules, {
    fields: [links.id],
    references: [linkRules.linkId],
  }),
  qrCode: one(linkQrCodes, {
    fields: [links.id],
    references: [linkQrCodes.linkId],
  }),
}));

module.exports.linksRelations = linksRelations;
