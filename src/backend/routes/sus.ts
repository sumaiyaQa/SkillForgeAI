import express from 'express';
import { pool } from '../db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Student submits their SUS score after finishing the survey
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId;

  if (req.role !== 'student') {
    return res.status(403).json({ message: 'Only students can submit SUS scores' });
  }

  const { score, responses } = req.body;

  if (typeof score !== 'number' || !Array.isArray(responses) || responses.length !== 10) {
    return res.status(400).json({ message: 'score (number) and responses (array of 10) are required' });
  }

  try {
    // Save the first submission and ignore any duplicate attempts
    await pool.query(
      `INSERT INTO sus_scores (user_id, score, responses)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, score, JSON.stringify(responses)]
    );

    res.status(201).json({ message: 'SUS score saved' });
  } catch (err) {
    console.error('SUS SUBMIT ERROR:', err);
    res.status(500).json({ message: 'Failed to save SUS score' });
  }
});

// Student checks whether they have already submitted SUS
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId;

  if (req.role !== 'student') {
    return res.status(403).json({ message: 'Only students can query personal SUS status' });
  }

  try {
    const result = await pool.query(
      `SELECT score, created_at FROM sus_scores WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.json({ submitted: false, score: null });
    }

    return res.json({
      submitted: true,
      score: result.rows[0].score,
      created_at: result.rows[0].created_at,
    });
  } catch (err) {
    console.error('SUS STATUS ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch SUS status' });
  }
});

// Admin views all SUS scores along with student emails
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const result = await pool.query(`
      SELECT
        s.id,
        u.email,
        s.score,
        s.responses,
        s.created_at
      FROM sus_scores s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `);

    // Include summary stats for the dashboard too
    const stats = await pool.query(`
      SELECT
        COUNT(*)::int              AS total_responses,
        ROUND(AVG(score), 1)       AS avg_score,
        ROUND(MIN(score), 1)       AS min_score,
        ROUND(MAX(score), 1)       AS max_score
      FROM sus_scores
    `);

    res.json({
      scores: result.rows,
      stats: stats.rows[0],
    });
  } catch (err) {
    console.error('SUS FETCH ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch SUS scores' });
  }
});

export default router;