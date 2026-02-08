import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/* ======================================================
   SAVE USER PROGRESS
   ====================================================== */
router.post("/", authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const { profile, lastProblemId, lastCode } = req.body;

  try {
    // Ensure user exists
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(401).json({
        message: "User does not exist. Please log in again.",
      });
    }

    // UPSERT progress
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

    res.json({ message: "Progress saved successfully" });
  } catch (err) {
    console.error("SAVE PROGRESS ERROR:", err);
    res.status(500).json({ message: "Failed to save progress" });
  }
});

/* ======================================================
   LOAD USER PROGRESS
   ====================================================== */
router.get("/", authenticateToken, async (req, res) => {
  const userId = (req as any).userId;

  try {
    // Get skill level from users table (authoritative)
    const userResult = await pool.query(
      "SELECT skill_level FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        message: "User does not exist. Please log in again.",
      });
    }

    const skillLevel = userResult.rows[0].skill_level || "beginner";

    // Get existing progress
    const progressResult = await pool.query(
      `
      SELECT profile, last_problem_id, last_code
      FROM user_progress
      WHERE user_id = $1
      `,
      [userId]
    );

    // New user — return default profile
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
          strengths: [],
          weaknesses: [],
        },
        last_problem_id: null,
        last_code: null,
      });
    }

    // Existing user — merge profile with authoritative skill level
    const savedProfile = progressResult.rows[0].profile;

    res.json({
      profile: {
        ...savedProfile,
        skillLevel, // ALWAYS trust users.skill_level
      },
      last_problem_id: progressResult.rows[0].last_problem_id,
      last_code: progressResult.rows[0].last_code,
    });
  } catch (err) {
    console.error("LOAD PROGRESS ERROR:", err);
    res.status(500).json({ message: "Failed to load progress" });
  }
});

/* ======================================================
   ADMIN SUMMARY (STUDENTS ONLY)
   ====================================================== */
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    // Skill level distribution (students only)
    const skillDistribution = await pool.query(`
      SELECT 
        u.skill_level AS level,
        COUNT(*)::int AS count
      FROM users u
      JOIN user_progress p ON p.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.skill_level
      ORDER BY u.skill_level
    `);

    // Average performance metrics
    const averages = await pool.query(`
      SELECT
        AVG((p.profile->>'problemsSolved')::int) AS avg_solved,
        AVG((p.profile->>'successfulSubmissions')::int) AS avg_success
      FROM users u
      JOIN user_progress p ON p.user_id = u.id
      WHERE u.role = 'student'
    `);

    res.json({
      skillDistribution: skillDistribution.rows,
      averages: averages.rows[0],
    });
  } catch (err) {
    console.error("ADMIN SUMMARY ERROR:", err);
    res.status(500).json({ message: "Failed to fetch admin summary" });
  }
});

export default router;
