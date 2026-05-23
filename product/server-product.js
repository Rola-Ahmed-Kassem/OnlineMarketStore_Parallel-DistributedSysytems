// ============================================================
//  PRODUCT SERVICE — server entry point
//  Handles: add, edit, delete, view, search items + my-items
//  DB: products_db (productsDb.js)
//  Port: 3003
// ============================================================

require("dotenv").config();
const express = require("express");

const productRoutes = require("./productRoutes");

const PORT = process.env.PRODUCT_PORT || 3003;
const app  = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "product-service" }));

// Mounts:
//   GET    /api/products            (search / list all)
//   GET    /api/products/my-items   (authenticated — seller's own items)
//   GET    /api/products/:id
//   POST   /api/products            (authenticated)
//   PUT    /api/products/:id        (authenticated + owner only)
//   DELETE /api/products/:id        (authenticated + owner only)
app.use("/api/products", productRoutes);

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
  console.error("[Product Service - Unhandled Error]", err);
  res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: "Internal Server Error",
    message: "Internal server error.",
    path: req.path,
  });
});

app.listen(PORT, () => console.log(`✅ Product Service running on port ${PORT}`));
module.exports = app;
