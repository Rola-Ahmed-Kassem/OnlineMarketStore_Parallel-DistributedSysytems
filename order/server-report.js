// ============================================================
//  REPORT SERVICE — server entry point
//  Handles: transaction reports and sales reports
//  DB: finance_db (financeDb.js) — read only
//  Port: 3004
//
//  Access: admin and owner userType only (enforced in orderRoutes)
//  The report routes are defined inside orderRoutes.js under /reports/*
//  If you later split them into reportRoutes.js, update the import below.
// ============================================================

require("dotenv").config();
const express = require("express");

const orderRoutes = require("./orderRoutes"); // /reports/* lives here for now

const PORT = process.env.REPORT_PORT || 3004;
const app  = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "report-service" }));

// Mounts:
//   GET /api/v1/reports/transactions?startDate=&endDate=
//   GET /api/v1/reports/sales?startDate=&endDate=
app.use("/api/v1", orderRoutes);

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
  console.error("[Report Service - Unhandled Error]", err);
  res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: "Internal Server Error",
    message: "Internal server error.",
    path: req.path,
  });
});

app.listen(PORT, () => console.log(`✅ Report Service running on port ${PORT}`));
module.exports = app;
