import express from 'express';
import { pool } from '../db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Return all problems, sorted by difficulty and then by id.
// A valid auth token is required so anonymous users cannot scrape the list.

router.get('/', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        difficulty,
        description,
        starter_code,
        concepts,
        hints,
        function_name,
        example_cases,
        visualization
      FROM problems
      ORDER BY difficulty_order ASC, id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET PROBLEMS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch problems' });
  }
});

export default router;