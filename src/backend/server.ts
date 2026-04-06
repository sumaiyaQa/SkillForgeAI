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

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

// Middleware setup

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || localOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

// Health check route

app.get('/', async (_req, res) => {
  try {
    const result = await pool.query("SELECT 'Database connected!' AS msg");
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// API routes

app.use('/auth',     authRoutes);
app.use('/user',     userRoutes);
app.use('/progress', progressRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/admin',    adminRoutes);
app.use('/problems', problemRoutes);
app.use('/sus',      susRoutes);

// Catch any unhandled server errors

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start the server

const PORT = 4000;
const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

server.on('error', err => {
  console.error('Backend listen error:', err);
});