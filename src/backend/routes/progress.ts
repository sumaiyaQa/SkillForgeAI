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

  if (!profile || lastProblemId === undefined) {
    return res.status(400).json({ message: "Missing progress data" });
  }

  try {
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
router.get("/", authenticateToken, async (req, res) => {
  const userId = (req as any).userId;

  try {
    const result = await pool.query(
      "SELECT profile, last_problem_id, last_code FROM user_progress WHERE user_id = $1",
      [userId]
    );

    if (result.rowCount === 0) {
      return res.json(null); // New user
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load progress" });
  }
});

export default router;
