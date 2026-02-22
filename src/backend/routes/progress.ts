import express from 'express';
import { pool } from '../db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/* ================================================================
   SAVE USER PROGRESS (STUDENT)
================================================================ */

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId;

  if (req.role === 'admin') {
    return res.status(403).json({ message: 'Admins do not have learning progress' });
  }

  const { profile, lastProblemId, lastCode } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO user_progress (user_id, profile, last_problem_id, last_code)
      VALUES ($1, $2::jsonb, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        profile          = EXCLUDED.profile,
        last_problem_id  = EXCLUDED.last_problem_id,
        last_code        = EXCLUDED.last_code,
        updated_at       = NOW()
      `,
      [userId, JSON.stringify(profile), lastProblemId, lastCode]
    );

    res.json({ message: 'Progress saved successfully' });
  } catch (err) {
    console.error('SAVE PROGRESS ERROR:', err);
    res.status(500).json({ message: 'Failed to save progress' });
  }
});

/* ================================================================
   LOAD USER PROGRESS (STUDENT)
================================================================ */

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId;

  if (req.role === 'admin') {
    return res.status(403).json({ message: 'Admins do not have learning progress' });
  }

  try {
    const userResult = await pool.query(
      'SELECT skill_level FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: 'User does not exist' });
    }

    const skillLevel = userResult.rows[0].skill_level || 'beginner';

    const progressResult = await pool.query(
      `SELECT profile, last_problem_id, last_code
       FROM user_progress
       WHERE user_id = $1`,
      [userId]
    );

    if (progressResult.rowCount === 0) {
      return res.json({
        profile: {
          skillLevel,
          problemsSolved: 0,
          hintsUsed: 0,
          totalSubmissions: 0,
          successfulSubmissions: 0,
          totalSolveTimeSeconds: 0,
          averageSolveTimeSeconds: 0,
          lastSolveTimeSeconds: 0,
          errorPatterns: {},
          conceptMastery: {},
          strengths: [],
          weaknesses: [],
          learningTrajectory: [],
          errorHistory: [],
          solvedProblemIds: [],
          solvedSolutions: {},
        },
        last_problem_id: null,
        last_code: null,
      });
    }

    const savedProfile = progressResult.rows[0].profile;

    res.json({
      profile: {
        ...savedProfile,
        skillLevel,
        // Ensure arrays exist even if the stored profile pre-dates these fields
        learningTrajectory: savedProfile.learningTrajectory ?? [],
        errorHistory: savedProfile.errorHistory ?? [],
        solvedProblemIds: savedProfile.solvedProblemIds ?? [],
        errorPatterns: savedProfile.errorPatterns ?? {},
        conceptMastery: savedProfile.conceptMastery ?? {},
      },
      last_problem_id: progressResult.rows[0].last_problem_id,
      last_code: progressResult.rows[0].last_code,
    });
  } catch (err) {
    console.error('LOAD PROGRESS ERROR:', err);
    res.status(500).json({ message: 'Failed to load progress' });
  }
});

/* ================================================================
   ADMIN SUMMARY (ANALYTICS)
================================================================ */

router.get('/summary', authenticateToken, async (req: AuthRequest, res) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    /* ---- Total students ---- */
    const totalStudentsResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE role = 'student'
    `);

    /* ---- Skill distribution ---- */
    const skillDistribution = await pool.query(`
      SELECT
        u.skill_level AS level,
        COUNT(*)::int  AS count
      FROM users u
      JOIN user_progress p ON p.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.skill_level
      ORDER BY u.skill_level
    `);

    /* ---- Averages ---- */
    const averages = await pool.query(`
      SELECT
        COALESCE(AVG((p.profile->>'problemsSolved')::int), 0)       AS avg_solved,
        COALESCE(AVG(
          CASE
            WHEN (p.profile->>'totalSubmissions')::int > 0
            THEN (p.profile->>'successfulSubmissions')::float
                 / (p.profile->>'totalSubmissions')::float
            ELSE 0
          END
        ), 0) AS avg_success
      FROM users u
      JOIN user_progress p ON p.user_id = u.id
      WHERE u.role = 'student'
    `);

    /* ---- Concept mastery heatmap ---- */
    const conceptHeatmapResult = await pool.query(`
      SELECT
        key                  AS concept,
        AVG(value::float)    AS mastery
      FROM users u
      JOIN user_progress p ON p.user_id = u.id,
      LATERAL jsonb_each_text(
        COALESCE(p.profile->'conceptMastery', '{}'::jsonb)
      )
      WHERE u.role = 'student'
      GROUP BY key
      ORDER BY mastery ASC
    `);

    /* ---- Error frequency ---- */
    const errorFrequencyResult = await pool.query(`
      SELECT
        key              AS error_type,
        SUM(value::int)  AS count
      FROM users u
      JOIN user_progress p ON p.user_id = u.id,
      LATERAL jsonb_each_text(
        COALESCE(p.profile->'errorPatterns', '{}'::jsonb)
      )
      WHERE u.role = 'student'
      GROUP BY key
      ORDER BY count DESC
    `);

    /* ---- Learning trajectory (aggregate last 50 points per student, flatten + sort) ---- */
    const trajectoryResult = await pool.query(`
      SELECT
        elem->>'timestamp'      AS timestamp,
        (elem->>'overallMastery')::float AS overall_mastery
      FROM users u
      JOIN user_progress p ON p.user_id = u.id,
      LATERAL jsonb_array_elements(
        COALESCE(p.profile->'learningTrajectory', '[]'::jsonb)
      ) AS elem
      WHERE u.role = 'student'
      ORDER BY (elem->>'timestamp')::bigint ASC
      LIMIT 200
    `);

    // Group trajectory by timestamp bucket (round to nearest 5 min) and average mastery
    const trajectoryMap = new Map<number, number[]>();
    for (const row of trajectoryResult.rows) {
      const ts = Math.round(Number(row.timestamp) / 300000) * 300000; // 5-min bucket
      if (!trajectoryMap.has(ts)) trajectoryMap.set(ts, []);
      trajectoryMap.get(ts)!.push(Number(row.overall_mastery));
    }
    const trajectory = Array.from(trajectoryMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ts, values]) => ({
        timestamp: ts,
        overallMastery: values.reduce((a, b) => a + b, 0) / values.length,
      }));

    res.json({
      totalStudents: totalStudentsResult.rows[0].count,
      skillDistribution: skillDistribution.rows,
      averages: averages.rows[0],
      conceptHeatmap: conceptHeatmapResult.rows.reduce(
        (acc: Record<string, number>, row: any) => {
          acc[row.concept] = parseFloat(row.mastery);
          return acc;
        },
        {}
      ),
      errorFrequency: errorFrequencyResult.rows.reduce(
        (acc: Record<string, number>, row: any) => {
          acc[row.error_type] = parseInt(row.count);
          return acc;
        },
        {}
      ),
      trajectory,
    });
  } catch (err) {
    console.error('ADMIN SUMMARY ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch admin summary' });
  }
});

export default router;