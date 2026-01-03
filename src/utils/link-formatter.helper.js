const normalizeUrl = (url) => {
  if (!url) return null;

  // jika belum diawali http/https, tambahin
  return url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;
};

module.exports = { normalizeUrl };
