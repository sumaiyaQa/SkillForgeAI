import express from 'express';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// CURRENT AUTHENTICATED USER

// Simple utility endpoint used to verify authentication and retrieve basic user identity information.

router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({
    message: 'You are authenticated',
    userId: req.userId,
    role: req.role,
  });
});

export default router;
