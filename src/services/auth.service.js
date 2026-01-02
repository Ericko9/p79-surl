const db = require('../configs/database');
const { eq, or } = require('drizzle-orm');
const { users } = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');

// REGISTER
const register = async (username, email, password) => {
  // cek existing user
  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) throw new Error('USER_EXISTS');

  const passwordHash = await bcrypt.hash(password, 10);

  // insert new user ke db
  const [newUser] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      username,
      email,
      passwordHash,
    })
    .returning();

  return newUser;
};

// LOGIN
const login = async (email, password) => {
  // get data user dari db
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // cek apakah data user ada dan valid
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new Error('INVALID_CREDENTIALS');

  // generate token dengan JWT untuk 1 jam
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  return { token, user };
};

module.exports = { register, login };
