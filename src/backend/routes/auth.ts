import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// Helper for keeping skillLevel within the allowed values.
// If the client sends something missing or invalid, we fall back to beginner.

const VALID_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
type SkillLevel = typeof VALID_SKILL_LEVELS[number];

function sanitiseSkillLevel(raw: unknown): SkillLevel {
  if (typeof raw === 'string' && VALID_SKILL_LEVELS.includes(raw as SkillLevel)) {
    return raw as SkillLevel;
  }
  return 'beginner'; // safe default
}

// Register a new user. Everyone starts as a student unless the admin check passes.

router.post('/register', async (req, res) => {
  const { email, password, skillLevel, role, adminKey } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Admin sign-up needs a secret key
    let finalRole = 'student';
    if (role === 'admin') {
      if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid Admin Key' });
      }
      finalRole = 'admin';
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // sanitiseSkillLevel() keeps unexpected values out of the database.
    // That avoids the "value too long for type character varying(20)" error.
    const safeSkillLevel = sanitiseSkillLevel(skillLevel);

    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, skill_level, role)
       VALUES ($1, $2, $3, $4) RETURNING id, role`,
      [email, passwordHash, safeSkillLevel, finalRole]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.rows[0].id, role: newUser.rows[0].role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Log a user in and return a signed JWT that lasts for 7 days.

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const result = await pool.query(
      `SELECT id, password_hash, role, skill_level
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

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