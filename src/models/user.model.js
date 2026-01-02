const { sqliteTable, text } = require('drizzle-orm/sqlite-core');

// definisi tabel 'users'
const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  resetPasswordToken: text('reset_password_token'),
  resetPasswordExpires: text('reset_password_expires'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

module.exports = { users };
