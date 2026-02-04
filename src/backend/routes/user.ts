import express from "express";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", authenticateToken, (req, res) => {
  res.json({
    message: "You are authenticated",
    userId: (req as any).userId,
  });
});

export default router;
