const db = require('../configs/database');
const { eq, and, gt } = require('drizzle-orm');
const { users } = require('../models/user.model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

// GET USER PROFILE
const getProfile = async (userId) => {
  // get data user dari db
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  });

  // cek apakah ada user profilenya
  if (!user) throw new Error('USER_NOT_FOUND');

  return user;
};

// UPDATE USER PROFILE
const updateProfile = async (userId, updateData) => {
  const { username, email } = updateData;

  const updatedAt = new Date().toISOString();

  // update data user di db
  const [updatedUser] = await db
    .update(users)
    .set({
      username: username || undefined, // Jika null/empty, tidak akan update
      email: email || undefined,
      updatedAt: updatedAt,
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      updatedAt: users.updatedAt,
    });

  // cek apakah data user ada dan berhasil update
  if (!updatedUser) throw new Error('USER_NOT_FOUND');

  return updatedUser;
};

// CHANGE USER PASSWORD
const changePassword = async (userId, oldPassword, newPassword) => {
  // cek data user di db
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  // verifikasi password lama
  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) throw new Error('OLD_PASSWORD_INCORRECT');

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // update data di db
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash })
    .where(eq(users.id, userId));

  return true;
};

// DELETE USER DATA
const deleteUser = async (userId) => {
  // delete data user dari db
  const result = await db.delete(users).where(eq(users.id, userId)).returning();

  // cek apakah data user berhasil didelete
  if (result.length === 0) throw new Error('USER_NOT_FOUND');

  return true;
};

// FIND USER BY EMAIL
const findUserByEmail = async (email) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // jika email tidak ada/tidak terdaftar
  if (!user) {
    throw new AppError('Email not registered.', 404);
  }

  return user;
};

// SAVE RESET PASSWORD TOKEN (EMAIL)
const saveResetToken = async (userId, resetToken) => {
  try {
    // hashing expire token
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // buat expire date
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // update data reset token dan expire di db
    const result = await db
      .update(users)
      .set({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expiresAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning();

    // cek apakah data berhasil diupdate
    if (result.length === 0) {
      throw new AppError(
        'Failed to save reset token. User might not exist.',
        404
      );
    }

    return result[0];
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error(error.message);

    throw new AppError(
      'An error occurred while securing your reset request. Please try again.',
      500
    );
  }
};

// RESET PASSWORD
const resetPassword = async (token, newPassword) => {
  // hask token dari URL untuk matching dengan yang di db
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // find user yang memiliki token tersebut
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.resetPasswordToken, hashedToken),
      gt(users.resetPasswordExpires, new Date().toISOString())
    ),
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired.', 400);
  }

  // hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // update password dan hapus token
  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id));

  return true;
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteUser,
  findUserByEmail,
  saveResetToken,
  resetPassword,
};
