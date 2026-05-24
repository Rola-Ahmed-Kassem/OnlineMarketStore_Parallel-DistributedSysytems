// ============================================================
//  WALLET SERVICE — server entry point
//  Handles: balance, deposit, transaction history
//  DB: finance_db (financeDb.js)
//  Port: 3001
// ============================================================
const path  = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");

const walletRoutes = require("./walletRoutes");

const PORT = process.env.WALLET_PORT || 3001;
const app  = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "wallet-service" }));

app.use("/api/v1/wallet", walletRoutes);

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
  console.error("[Wallet Service - Unhandled Error]", err);
  res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: "Internal Server Error",
    message: "Internal server error.",
    path: req.path,
  });
});

app.listen(PORT, () => console.log(`✅ Wallet Service running on port ${PORT}`));
module.exports = app;
