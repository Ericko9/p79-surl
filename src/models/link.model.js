const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { users } = require('./user.model');

// Definisi tabel 'links'
const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  shortKey: text('short_key').notNull().unique(),
  redirectUri: text('redirect_uri').notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).default(false),
  clickCount: integer('click_count').default(0),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

module.exports = { links };
