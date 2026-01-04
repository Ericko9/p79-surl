const userService = require('../services/user.service');
const asyncHandler = require('express-async-handler');

/*  USER MANAGEMENT
    1. Get user profile
    2. Update user profile
    3. Change password
    4. Delete user
*/

const getProfile = async (req, res) => {
  try {
    // get user id dari cookie
    const userId = req.user?.id;

    // call getProfile service
    const user = await userService.getProfile(userId);

    return res.json({
      status: true,
      data: user,
    });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND')
      return res.status(404).json({ message: 'User not found' });

    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    // get user id dari cookie
    const userId = req.user?.id;
    const { username, email } = req.body;

    // cek apakah ada yang diupdate
    if (!username && !email)
      return res.status(400).json({ message: 'No data provided to update.' });

    // call updateProfile service
    const updatedUser = await userService.updateProfile(userId, {
      username,
      email,
    });

    return res.json({
      status: true,
      data: updatedUser,
    });
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res
        .status(409)
        .json({ message: 'Username or email already in use' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    // get user id dari cookie
    const userId = req.user?.id;
    const { old_password: oldPassword, new_password: newPassword } = req.body;

    // Validasi input
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Old and new password are required' });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: 'New password must be at least 8 characters' });
    }

    // call changePassword service
    await userService.changePassword(userId, oldPassword, newPassword);

    return res.status(200).json({
      status: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'User not found' });
    }

    if (error.message === 'OLD_PASSWORD_INCORRECT') {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    // get user id dari cookie
    const userId = req.user?.id;

    // call deleteUser service
    await userService.deleteUser(userId);

    // logout akun
    res.clearCookie('access_token');

    return res.json({
      status: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: 'Internal server error' });
  }
};

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const {
    new_password: newPassword,
    confirm_new_password: confirmNewPassword,
  } = req.body;

  // cek field
  if (newPassword !== confirmNewPassword) {
    throw new AppError('Passwords do not match.', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  // call resetPassword service
  await userService.resetPassword(token, newPassword);

  res.status(200).json({
    status: true,
    message:
      'Password has been successfully reset. You can now login with your new password.',
  });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteUser,
  resetPassword,
};
