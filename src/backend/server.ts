import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import progressRoutes from './routes/progress.js';
import feedbackRoutes from './routes/feedback.js';

import { pool } from './db.js';

const app = express();

// MIDDLEWARE

// Enables CORS so the frontend application can communicate with the backend API.
// This must be registered before any routes.
 
app.use(
  cors({
    origin: 'http://localhost:5173', // Frontend (Vite)
    credentials: true,
  })
);

// Parses incoming JSON request bodies.
 
app.use(express.json());

// HEALTH CHECK

// Simple endpoint to verify database connectivity.
// Useful during development and debugging.
 
app.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT 'Database connected!' AS msg"
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// ROUTES

// Authentication
 
app.use('/auth', authRoutes);

// Authenticated user utilities

app.use('/user', userRoutes);

// Student progress persistence and admin analytics

app.use('/progress', progressRoutes);

// Student feedback submission and admin review

app.use('/feedback', feedbackRoutes);

// SERVER START

const PORT = 4000;


app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});


app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
