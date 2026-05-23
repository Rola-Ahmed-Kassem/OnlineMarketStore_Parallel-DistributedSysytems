// ============================================================
//  ORDER SERVICE — server entry point
//  Handles: purchase, purchased history, sold history
//  Also mounts: report routes (tightly coupled to finance_db)
//  DB: finance_db (financeDb.js) — also calls walletService
//      and productService internally (cross-service logic)
//  Port: 3002
//
//  NOTE ON MICROSERVICES DESIGN:
//  orderService.js directly imports walletService and productService.
//  In a fully separated microservices setup these would be HTTP calls
//  to the wallet and product services. For Phase 1, they share code
//  within this process as the project spec allows (same Node/Express stack).
// ============================================================

require("dotenv").config();
const express = require("express");

const orderRoutes = require("./orderRoutes"); // includes /orders/* and /reports/*

const PORT = process.env.ORDER_PORT || 3002;
const app  = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "order-service" }));

// Mounts:
//   POST   /api/v1/orders/purchase
//   GET    /api/v1/orders/purchased
//   GET    /api/v1/orders/sold
//   GET    /api/v1/reports/transactions
//   GET    /api/v1/reports/sales
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
  console.error("[Order Service - Unhandled Error]", err);
  res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: "Internal Server Error",
    message: "Internal server error.",
    path: req.path,
  });
});

app.listen(PORT, () => console.log(`✅ Order Service running on port ${PORT}`));
module.exports = app;
