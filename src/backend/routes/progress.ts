import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * SAVE progress
 */
router.post("/", authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const { profile, lastProblemId, lastCode } = req.body;

  try {
    // 1. Check if the user actually exists in the users table
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    
    if (userCheck.rowCount === 0) {
      // If the user doesn't exist, tell the frontend to log out
      return res.status(401).json({ message: "User no longer exists. Please log out." });
    }

    // 2. If they exist, proceed with the UPSERT
    await pool.query(
      `
      INSERT INTO user_progress (user_id, profile, last_problem_id, last_code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        profile = EXCLUDED.profile,
        last_problem_id = EXCLUDED.last_problem_id,
        last_code = EXCLUDED.last_code,
        updated_at = NOW()
      `,
      [userId, profile, lastProblemId, lastCode]
    );

    res.json({ message: "Progress saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save progress" });
  }
});
/**
 * LOAD progress
 */
/**
 * LOAD progress
 */
router.get("/", authenticateToken, async (req, res) => {
  const userId = (req as any).userId;

  try {
    // 1. Try to get existing progress
    const progressResult = await pool.query(
      "SELECT profile, last_problem_id, last_code FROM user_progress WHERE user_id = $1",
      [userId]
    );

    // 2. ALWAYS get the user's skill level from users table
    const userResult = await pool.query(
      "SELECT skill_level FROM users WHERE id = $1",
      [userId]
    );

    const skillLevel = userResult.rows[0]?.skill_level || 'beginner';

    if (progressResult.rowCount === 0) {
      // New user - return default profile with correct skill level from registration
      return res.json({
        profile: {
          skillLevel: skillLevel,
          problemsSolved: 0,
          hintsUsed: 0,
          totalSubmissions: 0,
          successfulSubmissions: 0,
          totalSolveTimeSeconds: 0,
          averageSolveTimeSeconds: 0,
          lastSolveTimeSeconds: 0,
          errorPatterns: {},
          strengths: [],
          weaknesses: []
        },
        last_problem_id: null,
        last_code: null
      });
    }

    // Existing user - merge saved profile with current skill level from users table
    const savedProfile = progressResult.rows[0].profile;
    const mergedProfile = {
      ...savedProfile,
      skillLevel: skillLevel // Always use the authoritative skill_level from users table
    };

    res.json({
      profile: mergedProfile,
      last_problem_id: progressResult.rows[0].last_problem_id,
      last_code: progressResult.rows[0].last_code
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load progress" });
  }
});
/**
 * GET admin summary of all student progress
 */
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    // 1. Get skill level distribution
    const skillDist = await pool.query(
      "SELECT profile->>'skillLevel' as level, COUNT(*) as count FROM user_progress GROUP BY level"
    );

    // 2. Get average metrics
    const avgMetrics = await pool.query(
      `SELECT 
        AVG((profile->>'problemsSolved')::int) as avg_solved,
        AVG((profile->>'successfulSubmissions')::int) as avg_success
       FROM user_progress`
    );

    res.json({
      skillDistribution: skillDist.rows,
      averages: avgMetrics.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch admin summary" });
  }
});

export default router;
