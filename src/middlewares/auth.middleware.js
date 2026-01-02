const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const token = req.cookies?.access_token;

  // cek token di cookie
  if (!token) {
    return res.status(401).json({
      status: false,
      message: 'Unauthorized!',
    });
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
    console.log(error);

    return res.status(401).json({
      status: false,
      message: 'Invalid or expired token.',
    });
  }
};
