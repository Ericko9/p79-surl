const { v2: cloudinary } = require('cloudinary');

if (!process.env.CLOUDINARY_URL) {
  throw new Error('Cloudinary configuration is not configured in .env');
}

cloudinary.config({
  secure: true,
});

module.exports = cloudinary;
