import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper — ensures whatever arrives from the client for skillLevel is one
// of the three valid values. Defaults to 'beginner' if missing or invalid.
//
// WHY THIS EXISTS:
// The users.skill_level column is VARCHAR and the DB will reject anything
// that doesn't fit. More importantly, we never want arbitrary client data
// written directly to the DB — always validate on the server side first.
// ---------------------------------------------------------------------------

const VALID_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
type SkillLevel = typeof VALID_SKILL_LEVELS[number];

function sanitiseSkillLevel(raw: unknown): SkillLevel {
  if (typeof raw === 'string' && VALID_SKILL_LEVELS.includes(raw as SkillLevel)) {
    return raw as SkillLevel;
  }
  return 'beginner'; // safe default
}

// ---------------------------------------------------------------------------
// REGISTER
// Creates a new student account. All registered users default to 'student'.
// ---------------------------------------------------------------------------

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

    // Role logic: admin registration requires a secret key
    let finalRole = 'student';
    if (role === 'admin') {
      if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid Admin Key' });
      }
      finalRole = 'admin';
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // sanitiseSkillLevel() prevents any string longer than 'intermediate'
    // (or any unexpected value) from reaching the VARCHAR column.
    // This is the fix for the "value too long for type character varying(20)" error.
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

// ---------------------------------------------------------------------------
// LOGIN
// Authenticates a user and issues a signed JWT (7-day expiry).
// ---------------------------------------------------------------------------

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