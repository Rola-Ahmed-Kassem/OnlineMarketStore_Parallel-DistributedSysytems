// ============================================================
//  USERS SERVICE — server entry point
//  Handles: auth (register, login, logout) + user profile
//  DB: users_db (usersDb.js)
//  Port: 3005
// ============================================================

require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const userRoutes = require("./userRoutes");

if (!process.env.JWT_SECRET)  throw new Error("FATAL: JWT_SECRET is not set.");
if (!process.env.DB_PASSWORD) throw new Error("FATAL: DB_PASSWORD is not set.");

const PORT = process.env.USERS_PORT || 3005;
const app  = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' is not allowed.`));
  },
  credentials: true,
}));

app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "users-service" }));

// Mounts all auth + user routes under /api/v1
app.use("/api/v1", userRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    timestamp: new Date().toISOString(),
    status: 404,
    error: "Not Found",
    message: "Route not found.",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error("[Users Service - Unhandled Error]", err);
  res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: "Internal Server Error",
    message: "Internal server error.",
    path: req.path,
  });
});

app.listen(PORT, () => console.log(`✅ Users Service running on port ${PORT}`));
module.exports = app;
