const authService = require('../services/auth.service');

/*  AUTHENTICATION & AUTHORIZATION
    1. Register
    2. Login
    3. Logout
*/

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // cek form field
    if (!email || !username || !password)
      return res.status(400).json({ message: 'Missing fields!' });

    if (password.length < 8)
      return res.status(400).json({ message: 'Password too short!' });

    // call register service
    const newUser = await authService.register(username, email, password);

    return res.status(201).json({
      status: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.createdAt,
      },
    });
  } catch (error) {
    if (error.message === 'USER_EXISTS')
      return res.status(409).json({ message: 'User already exists.' });

    res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // cek form field
    if (!email || !password)
      return res.status(400).json({ message: 'Email and Password required' });

    // call login service
    const { token } = await authService.login(email, password);

    // buat cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // seconds, minute, milli seconds = 3.600.000 ms
    });

    return res.status(200).json({
      status: true,
      message: 'Login successfully',
    });
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS')
      return res.status(401).json({ message: 'Invalid credentials!' });

    res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = (req, res) => {
  // hapus token di cookie
  res.clearCookie('access_token');

  res.status(200).json({
    status: true,
    message: 'Logged out successfully',
  });
};

module.exports = { register, login, logout };
