import express from 'express';
import { pool } from '../db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All routes in this file require admin role.
// The adminOnly middleware is applied per-route below.

function adminOnly(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  if (req.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

/* ================================================================
   USER MANAGEMENT
================================================================ */

// GET /admin/users — list all students with their progress summary
router.get('/users', authenticateToken, adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.role,
        u.skill_level,
        u.created_at,
        COALESCE((p.profile->>'problemsSolved')::int, 0)          AS problems_solved,
        COALESCE((p.profile->>'totalSubmissions')::int, 0)        AS total_submissions,
        COALESCE((p.profile->>'successfulSubmissions')::int, 0)   AS successful_submissions,
        COALESCE((p.profile->>'hintsUsed')::int, 0)               AS hints_used,
        p.updated_at                                               AS last_active
      FROM users u
      LEFT JOIN user_progress p ON p.user_id = u.id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET USERS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// PATCH /admin/users/:id/skill — manually override a student's skill level
router.patch('/users/:id/skill', authenticateToken, adminOnly, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { skillLevel } = req.body;

  const validLevels = ['beginner', 'intermediate', 'advanced'];
  if (!validLevels.includes(skillLevel)) {
    return res.status(400).json({ message: 'Invalid skill level' });
  }

  try {
    await pool.query(
      'UPDATE users SET skill_level = $1 WHERE id = $2',
      [skillLevel, id]
    );
    res.json({ message: 'Skill level updated' });
  } catch (err) {
    console.error('UPDATE SKILL ERROR:', err);
    res.status(500).json({ message: 'Failed to update skill level' });
  }
});

// DELETE /admin/users/:id — remove a student account and all their data
router.delete('/users/:id', authenticateToken, adminOnly, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    // Delete progress and feedback first (FK constraint), then the user
    await pool.query('DELETE FROM user_progress WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM feedback WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('DELETE USER ERROR:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// POST /admin/users/:id/reset — reset a student's progress without deleting their account
router.post('/users/:id/reset', authenticateToken, adminOnly, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM user_progress WHERE user_id = $1', [id]);
    res.json({ message: 'Student progress reset successfully' });
  } catch (err) {
    console.error('RESET PROGRESS ERROR:', err);
    res.status(500).json({ message: 'Failed to reset progress' });
  }
});

/* ================================================================
   PROBLEM MANAGEMENT (CRUD)
   Problems are stored in the DB so admins can manage them 
   without code changes. The frontend problemDatabase.ts remains 
   as the fallback seed — these DB records take precedence.
================================================================ */

// GET /admin/problems — list all problems
router.get('/problems', authenticateToken, adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM problems ORDER BY difficulty_order ASC, id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET PROBLEMS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch problems' });
  }
});

// POST /admin/problems — create a new problem
router.post('/problems', authenticateToken, adminOnly, async (req: AuthRequest, res) => {
  const { title, difficulty, description, starterCode, concepts, hints, functionName, exampleCases } = req.body;

  if (!title || !difficulty || !description || !starterCode) {
    return res.status(400).json({ message: 'title, difficulty, description and starterCode are required' });
  }

  const difficultyOrder = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;

  try {
    const result = await pool.query(
      `INSERT INTO problems
         (title, difficulty, difficulty_order, description, starter_code, concepts, hints, function_name, example_cases)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9::jsonb)
       RETURNING *`,
      [
        title,
        difficulty,
        difficultyOrder,
        description,
        starterCode,
        JSON.stringify(concepts ?? []),
        JSON.stringify(hints ?? []),
        functionName ?? null,
        JSON.stringify(exampleCases ?? []),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('CREATE PROBLEM ERROR:', err);
    res.status(500).json({ message: 'Failed to create problem' });
  }
});

// PUT /admin/problems/:id — update an existing problem
router.put('/problems/:id', authenticateToken, adminOnly, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, difficulty, description, starterCode, concepts, hints, functionName, exampleCases } = req.body;

  const difficultyOrder = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;

  try {
    const result = await pool.query(
      `UPDATE problems SET
         title            = $1,
         difficulty       = $2,
         difficulty_order = $3,
         description      = $4,
         starter_code     = $5,
         concepts         = $6::jsonb,
         hints            = $7::jsonb,
         function_name    = $8,
         example_cases    = $9::jsonb,
         updated_at       = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        title,
        difficulty,
        difficultyOrder,
        description,
        starterCode,
        JSON.stringify(concepts ?? []),
        JSON.stringify(hints ?? []),
        functionName ?? null,
        JSON.stringify(exampleCases ?? []),
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('UPDATE PROBLEM ERROR:', err);
    res.status(500).json({ message: 'Failed to update problem' });
  }
});

// DELETE /admin/problems/:id — remove a problem
router.delete('/problems/:id', authenticateToken, adminOnly, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM problems WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    res.json({ message: 'Problem deleted successfully' });
  } catch (err) {
    console.error('DELETE PROBLEM ERROR:', err);
    res.status(500).json({ message: 'Failed to delete problem' });
  }
});

export default router;