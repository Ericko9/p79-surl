const { sqliteTable, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Definisi tabel 'users'
const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at'),
});

module.exports = { users };
