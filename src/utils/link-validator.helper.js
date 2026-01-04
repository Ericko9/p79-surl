const AppError = require('./app-error.helper');

const validateKeyFormat = (key) => {
  if (!key) return;

  // cek key apakah diawali angka dan apakah mengandung simbol/spasi
  if (/^\d/.test(key)) {
    throw new AppError('Custom Key cannot start with a number.', 400);
  }

  // cek karakter tidak boleh selain huruf, angka, underscore (_), dan dash (-)
  if (/[^a-zA-Z0-9_-]/.test(key)) {
    throw new AppError(
      'Custom key can only contain letters, numbers, underscores, and hyphens.',
      400
    );
  }
};

const checkUrlValidity = (url) => {
  try {
    // cek apakah url valid (format: protocol://host terpenuhi)
    new URL(url);
  } catch (_) {
    throw new AppError(
      'Invalid URL format. Please provide a valid web address!',
      400
    );
  }
};

module.exports = { validateKeyFormat, checkUrlValidity };
