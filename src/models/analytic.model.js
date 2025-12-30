const { sqliteTable, text, index } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { links } = require('./link.model');

// Definisi tabel 'analytics'
const analytics = sqliteTable(
  'analytics',
  {
    id: text('id').primaryKey(),
    linkId: text('link_id')
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' }),
    ipAddress: text('ip_address'),
    browser: text('browser'),
    os: text('os'),
    referrer: text('referrer'),
    city: text('city'),
    accessedAt: text('accessed_at').default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    linkIdx: index('idx_analytics_link').on(table.linkId),
    accessedIdx: index('idx_analytics_accessed_at').on(table.accessedAt),
  })
);

module.exports = { analytics };
