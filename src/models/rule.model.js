const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { links } = require('./link.model');

// definisi tabel 'link_rules'
const linkRules = sqliteTable('link_rules', {
  id: text('id').primaryKey(),
  linkId: text('link_id')
    .notNull()
    .unique()
    .references(() => links.id, { onDelete: 'cascade' }),
  expireType: text('expire_type'),
  expireDate: text('expire_date'),
  maxClick: integer('max_click'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

module.exports = { linkRules };
