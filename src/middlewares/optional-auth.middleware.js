const jwt = require('jsonwebtoken');

module.exports = function optionalAuth(req, res, next) {
  const token = req.cookies?.access_token;

  // cek token, jika tidak ada biarkan lewat as guest
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // teruskan payload token ke request
    req.user = {
      id: decoded.id || decoded.sub || null,
      email: decoded.email || null,
    };

    next();
  } catch (error) {
    // token expired/broken stop request
    console.log(error);

    return res.status(401).json({
      status: false,
      message: 'The session has ended, the link has not been saved.',
      code: 'TOKEN_EXPIRED',
    });
  }
};
