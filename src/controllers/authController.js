// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

/**
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { email, password, full_name, role = 'researcher' } = req.body;

    // 1) email must be unique
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 2) create user
    const hashed = await bcrypt.hash(password, 10);
    const userIns = await query(
      `INSERT INTO users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
       VALUES ($1, $2, NOW(), $3)
       RETURNING id`,
      [email, hashed, JSON.stringify({ full_name, role })]
    );
    const userId = userIns.rows[0].id;

    // 3) create matching profile (NO email column here – we read email from users)
    await query(
      `INSERT INTO profiles (id, full_name, role)
       VALUES ($1, $2, $3)`,
      [userId, full_name, role]
    );

    // 4) issue JWT
    const token = jwt.sign({ userId, email, role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, email, full_name, role },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // users ←→ profiles join (email lives in users)
    const rs = await query(
      `SELECT u.id, u.email, u.encrypted_password, p.full_name, p.role
       FROM users u
       JOIN profiles p ON u.id = p.id
       WHERE u.email = $1`,
      [email]
    );
    if (!rs.rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rs.rows[0];
    const ok = await bcrypt.compare(password, user.encrypted_password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * GET /api/auth/me
 * Use this for re-hydration on refresh. Requires authenticate middleware.
 */
export const getMe = async (req, res) => {
  // authenticate middleware sets req.user = { id, email, full_name, role }
  return res.json({
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.full_name,
    role: req.user.role,
  });
};

/**
 * GET /api/auth/profile  (optional, richer profile)
 */
export const getProfile = async (req, res) => {
  try {
    const rs = await query(
      `SELECT u.id,
              u.email,
              p.full_name,
              p.role,
              p.bio,
              p.avatar_url,
              p.created_at
       FROM users u
       JOIN profiles p ON u.id = p.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (!rs.rows.length) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json(rs.rows[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
