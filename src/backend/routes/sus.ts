import express from 'express';
import { pool } from '../db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// POST /sus — student submits their SUS score after completing the survey
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
    // INSERT OR UPDATE — if the student somehow submits twice, keep the first
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

// GET /sus — admin retrieves all SUS scores with user emails
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

    // Also return aggregate stats useful for the dashboard
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