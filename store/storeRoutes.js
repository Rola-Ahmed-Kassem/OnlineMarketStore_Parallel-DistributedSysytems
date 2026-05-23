// ============================================================
//  STORE ROUTES  — belongs to: Store Service
//  Handles: external store registration + adding products
//  No SQL here — logic is in storeService.js / productService.js
// ============================================================

const express        = require("express");
const router         = express.Router();
const storeService   = require("./storeService");
const productService = require("../product/productService");

// ── Helpers ───────────────────────────────────────────────────────────────────

const HTTP_STATUS_TEXT = {
  400: "Bad Request", 401: "Unauthorized", 409: "Conflict", 500: "Internal Server Error",
};

function stdError(res, status, message, path) {
  return res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error: HTTP_STATUS_TEXT[status] || "Error",
    message,
    path,
  });
}

// ── Middleware: x-api-key authentication (stores only, NOT JWT) ───────────────
// External stores authenticate with the API key issued at registration,
// not a JWT token. This middleware validates the key and puts the store
// record on req.store so the route can use it.

async function authenticateStore(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return stdError(res, 401, "Missing x-api-key header.", req.path);
  }
  try {
    req.store = await storeService.getStoreByApiKey(apiKey);
    next();
  } catch (err) {
    return stdError(res, err.statusCode || 401, err.message, req.path);
  }
}

// ── POST /api/v1/stores/register — public ────────────────────────────────────
// Spec section 4.11: storeName, ownerName, email
// Returns storeId (STORE-XXXX) and the apiKey (shown once, never again).

router.post("/register", async (req, res) => {
  const { storeName, ownerName, email

  
   } = req.body;

  if (!storeName || !ownerName || !email) {
    return stdError(res, 400, "storeName, ownerName, and email are required.", req.path);
  }

  try {
    const result = await storeService.registerStore({ storeName, ownerName, email });
    return res.status(201).json({
      message: "Store registered successfully",
      storeId: `STORE-${result.storeId}`,
      apiKey:  result.apiKey, // shown once — store securely
    });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

// ── POST /api/v1/stores/items — x-api-key auth ───────────────────────────────
// Spec section 4.12: external store adds a product using their API key.
// seller_id is the store's id, seller_type is "STORE".

router.post("/items", authenticateStore, async (req, res) => {
  const { name, brand, description, price, quantity, category } = req.body;

  if (!name || price === undefined || quantity === undefined) {
    return stdError(res, 400, "name, price, and quantity are required.", req.path);
  }
  if (price <= 0 || quantity < 0) {
    return stdError(res, 400, "Price must be greater than 0 and quantity cannot be negative.", req.path);
  }

  try {
    const itemId = await productService.addProduct({
      seller_id:   req.store.id,
      seller_type: "STORE",          // distinguishes store listings from user listings
      name,
      brand,
      description,
      price,
      quantity,
      category,
    });

    return res.status(201).json({
      message: "External store item added successfully",
      itemId:  `ITEM-${itemId}`,
    });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

module.exports = router;
