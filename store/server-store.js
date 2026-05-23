// ============================================================
//  STORE SERVICE — server entry point
//  Handles: external store registration + adding products
//  DB: users_db via storesDb.js (stores table lives in Users DB)
//      products_db via productsDb.js (items added go to products DB)
//  Port: 3006
// ============================================================

require("dotenv").config();
const express = require("express");

const storeRoutes = require("./storeRoutes");

const PORT = process.env.STORE_PORT || 3006;
const app  = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "store-service" }));

// Mounts:
//   POST  /api/v1/stores/register   (public — returns storeId + apiKey)
//   POST  /api/v1/stores/items      (x-api-key auth — adds product from external store)
app.use("/api/v1/stores", storeRoutes);

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
  console.error("[Store Service - Unhandled Error]", err);
  res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: "Internal Server Error",
    message: "Internal server error.",
    path: req.path,
  });
});

app.listen(PORT, () => console.log(`✅ Store Service running on port ${PORT}`));
module.exports = app;
