import express from 'express';
import { pool } from '../db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Student feedback submission

// Let a student leave feedback for a problem.
// They can give a rating, a comment, or both.

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId;
  const { problemId, rating, comment } = req.body;

  // Only students are allowed to submit feedback
  if (req.role !== 'student') {
    return res.status(403).json({
      message: 'Only students can submit feedback',
    });
  }

  if (!problemId) {
    return res.status(400).json({
      message: 'Problem ID is required',
    });
  }

  try {
    await pool.query(
      `
      INSERT INTO feedback (user_id, problem_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      `,
      [userId, problemId, rating ?? null, comment ?? null]
    );

    res.status(201).json({
      message: 'Feedback submitted successfully',
    });
  } catch (err) {
    console.error('SUBMIT FEEDBACK ERROR:', err);
    res.status(500).json({
      message: 'Failed to submit feedback',
    });
  }
});

// Admin feedback view

// Return all submitted feedback for admin review.
// This endpoint is read-only and only available to admins.

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  // Admin-only access
  if (req.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required',
    });
  }

  try {
    const result = await pool.query(`
      SELECT
        f.id,
        u.email,
        f.problem_id,
        f.rating,
        f.comment,
        f.created_at
      FROM feedback f
      JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('LOAD FEEDBACK ERROR:', err);
    res.status(500).json({
      message: 'Failed to load feedback',
    });
  }
});

export default router;
