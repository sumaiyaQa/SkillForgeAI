import express from "express";
import { pool } from "../db.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";

const router = express.Router();

/* ================================================================
   SAVE USER PROGRESS
================================================================ */

router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId;

  if (req.role === "admin") {
    return res.status(403).json({ message: "Admins do not have learning progress" });
  }

  const { profile, lastProblemId, lastCode } = req.body;

  if (!profile) {
    return res.status(400).json({ message: "Profile required" });
  }

  try {
    await pool.query(
      `
      INSERT INTO user_progress (user_id, profile, last_problem_id, last_code)
      VALUES ($1,$2::jsonb,$3,$4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        profile = EXCLUDED.profile,
        last_problem_id = EXCLUDED.last_problem_id,
        last_code = EXCLUDED.last_code,
        updated_at = NOW()
      `,
      [userId, JSON.stringify(profile), lastProblemId, lastCode]
    );

    res.json({ message: "Progress saved successfully" });
  } catch (err) {
    console.error("SAVE PROGRESS ERROR:", err);
    res.status(500).json({ message: "Failed to save progress" });
  }
});

/* ================================================================
   LOAD USER PROGRESS
================================================================ */

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId;

  if (req.role === "admin") {
    return res.status(403).json({ message: "Admins do not have learning progress" });
  }

  try {
    const userResult = await pool.query(
      "SELECT skill_level FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: "User does not exist" });
    }

    const skillLevel = userResult.rows[0].skill_level || "beginner";

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
    console.error("LOAD PROGRESS ERROR:", err);
    res.status(500).json({ message: "Failed to load progress" });
  }
});

/* ================================================================
   ADMIN SUMMARY
================================================================ */

router.get("/summary", authenticateToken, async (req: AuthRequest, res) => {
  if (req.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const studentsResult = await pool.query(`
      SELECT u.skill_level, p.profile
      FROM users u
      LEFT JOIN user_progress p ON p.user_id = u.id
      WHERE u.role = 'student'
    `);

    const rows = studentsResult.rows;

    const totalStudents = rows.length;

    const skillDistribution: Record<string, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };

    let totalSolved = 0;
    let totalSuccess = 0;
    let totalSubmissions = 0;

    const conceptHeatmap: Record<string, number[]> = {};
    const errorFrequency: Record<string, number> = {};
    const trajectory: { timestamp: number; overallMastery: number }[] = [];

    for (const row of rows) {
      const profile = row.profile || {};

      const level = row.skill_level || "beginner";
      skillDistribution[level] = (skillDistribution[level] || 0) + 1;

      totalSolved += profile.problemsSolved || 0;
      totalSuccess += profile.successfulSubmissions || 0;
      totalSubmissions += profile.totalSubmissions || 0;

      const concepts = profile.conceptMastery || {};
      for (const concept in concepts) {
        if (!conceptHeatmap[concept]) conceptHeatmap[concept] = [];
        conceptHeatmap[concept].push(concepts[concept]);
      }

      const errors = profile.errorPatterns || {};
      for (const err in errors) {
        errorFrequency[err] = (errorFrequency[err] || 0) + errors[err];
      }

      const traj = profile.learningTrajectory || [];
      for (const point of traj) {
        trajectory.push({
          timestamp: point.timestamp,
          overallMastery: point.overallMastery,
        });
      }
    }

    const conceptAvg: Record<string, number> = {};
    for (const concept in conceptHeatmap) {
      const values = conceptHeatmap[concept];
      if (!values || values.length === 0) continue;  // 👈 ADD THIS

      conceptAvg[concept] = values.reduce((a, b) => a + b, 0) / values.length;
    }

    const skillDistArray = Object.entries(skillDistribution).map(
      ([level, count]) => ({ level, count })
    );

    const averages = {
      avg_solved: totalStudents ? totalSolved / totalStudents : 0,
      avg_success:
        totalSubmissions > 0 ? totalSuccess / totalSubmissions : 0,
    };

    res.json({
      totalStudents,
      skillDistribution: skillDistArray,
      averages,
      conceptHeatmap: conceptAvg,
      errorFrequency,
      trajectory,
    });
  } catch (err) {
    console.error("ADMIN SUMMARY ERROR:", err);
    res.status(500).json({ message: "Failed to fetch admin summary" });
  }
});

export default router;

