import express from 'express';
import cors from 'cors';

import authRoutes    from './routes/auth.js';
import userRoutes    from './routes/user.js';
import progressRoutes from './routes/progress.js';
import feedbackRoutes from './routes/feedback.js';
import adminRoutes   from './routes/admin.js';
import problemRoutes from './routes/problems.js';
import susRoutes     from './routes/sus.js';

import { pool } from './db.js';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/', async (_req, res) => {
  try {
    const result = await pool.query("SELECT 'Database connected!' AS msg");
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/auth',     authRoutes);
app.use('/user',     userRoutes);
app.use('/progress', progressRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/admin',    adminRoutes);
app.use('/problems', problemRoutes);
app.use('/sus',      susRoutes);

// ── Global error handler ──────────────────────────────────────────────────────

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});