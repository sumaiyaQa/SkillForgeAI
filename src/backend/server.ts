import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import progressRoutes from "./routes/progress.js";
import { pool } from "./db.js";

const app = express();

// ADD CORS MIDDLEWARE HERE (before express.json())
app.use(cors({
  origin: "http://localhost:5173", // Your frontend URL
  credentials: true
}));

app.use(express.json());

app.get("/", async (_req, res) => {
  const result = await pool.query("SELECT 'Database connected!' AS msg");
  res.json(result.rows[0]);
});

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/progress", progressRoutes);

app.listen(4000, () => {
  console.log("Backend running on http://localhost:5173/");
});
