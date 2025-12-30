require('dotenv').config();

/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: './src/models/*.js', // Deteksi semua file model
  out: './drizzle', // Folder output migrasi
  dialect: 'turso', // Driver Turso
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
};
