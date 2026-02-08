import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// REGISTER

// Creates a new student account.
// All registered users default to the 'student' role.

router.post('/register', async (req, res) => {
  const { email, password, skillLevel } = req.body;

  // Basic input validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email and password required' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return res
        .status(409)
        .json({ message: 'User already exists' });
    }

    // Hash password before storing
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user as a student
    await pool.query(
      `
      INSERT INTO users (email, password_hash, skill_level, role)
      VALUES ($1, $2, $3, 'student')
      `,
      [email, passwordHash, skillLevel || 'beginner']
    );

    res.status(201).json({
      message: 'User registered successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN

// Authenticates a user and issues a signed JWT token.
// The token includes both user ID and role.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email and password required' });
  }

  try {
    // Retrieve user credentials
    const result = await pool.query(
      `
      SELECT id, password_hash, role, skill_level
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res
        .status(401)
        .json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res
        .status(401)
        .json({ message: 'Invalid credentials' });
    }

    // Generate JWT containing user identity and role
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // Return token and minimal user info to client
    res.json({
      token,
      role: user.role,
      skillLevel: user.skill_level,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
