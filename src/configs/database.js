var { createClient } = require('@libsql/client');
var { drizzle } = require('drizzle-orm/libsql');

const schema = require('../models');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Environment variable for Turso not configured in .env');
}

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(turso, { schema });

module.exports = db;
