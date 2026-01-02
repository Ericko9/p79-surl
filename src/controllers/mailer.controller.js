const userService = require('../services/user.service');
const mailerService = require('../services/mailer.service');
const jwt = require('jsonwebtoken');

/*  MAIL MANAGEMENT
    1. Forgot Password
*/

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await userService.findUserByEmail(email);

  const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });

  await userService.saveResetToken(user.id, resetToken);
  await mailerService.sendResetPasswordLink(user.email, resetToken);

  return res.json({
    status: true,
    message: 'A reset password link has been sent to your email address.',
  });
};

module.exports = {
  forgotPassword,
};
