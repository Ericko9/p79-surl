const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { links } = require('./link.model');

// Definisi tabel 'link_rules'
const linkRules = sqliteTable('link_rules', {
  id: text('id').primaryKey(),
  linkId: text('link_id')
    .notNull()
    .unique()
    .references(() => links.id, { onDelete: 'cascade' }),
  expireType: text('expire_type'),
  expireDate: text('expire_date'),
  maxClick: integer('max_click'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

module.exports = { linkRules };
