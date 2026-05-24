// ============================================================
//  PRODUCT ROUTES  — belongs to: Item/Product Service
//  No SQL here — all DB logic is in productService.js
// ============================================================

const express        = require("express");
const router         = express.Router();
const productService = require("./productService");
const { authenticateToken } = require("../auth/authMiddleware"); // FIX: destructure correctly

function errShape(status, message, path) {
  const text = { 400: "Bad Request", 404: "Not Found", 500: "Internal Server Error" };
  return { timestamp: new Date().toISOString(), status, error: text[status] || "Error", message, path };
}

// GET /api/products — public, no auth needed (spec: search is User/Public)
router.get("/", async (req, res) => {
  try {
    const products = await productService.getAllProducts(req.query.search);
    res.status(200).json({ message: "Products selected successfully", count: products.length, data: products });
  } catch (err) {
    console.log("GET PRODUCTS ERROR:", err.message);
    res.status(500).json(errShape(500, err.message, "/api/products"));
  }
});

// ── GET /api/products/my-items — authenticated seller views their own listings ─
// IMPORTANT: this route MUST be defined before /:id so Express doesn't treat
// "my-items" as an :id parameter
router.get("/my-items", authenticateToken, async (req, res) => {
  try {
    const sellerId = req.user.userId;
    // getAllProducts filters by search term; we need seller filter — handled below
    // productService.getProductsBySeller queries items WHERE seller_id = ?
    const products = await productService.getProductsBySeller(sellerId);
    res.status(200).json({
      message: "Your listed items retrieved successfully",
      count: products.length,
      data: products,
    });
  } catch (err) {
    res.status(500).json(errShape(500, err.message, "/api/products/my-items"));
  }
});

// GET /api/products/:id — public
router.get("/:id", async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json({ message: "Product selected successfully", data: product });
  } catch (err) {
    const status = err.message === "Product not found" ? 404 : 500;
    res.status(status).json(errShape(status, err.message, `/api/products/${req.params.id}`));
  }
});

// POST /api/products — FIX: requires JWT (spec FR-3: only authenticated users can add items)
router.post("/", authenticateToken, async (req, res) => {
  try {
    // FIX: seller_id comes from the verified JWT token, not the request body
    // This prevents a user from posting items on behalf of someone else
    const seller_id   = req.user.userId;
    const seller_type = req.user.userType || "USER";
    const { name, price, quantity, brand, description, category } = req.body;

    if (!name || price === undefined || quantity === undefined) {
      return res.status(400).json(errShape(400, "name, price, and quantity are required", "/api/products"));
    }
    if (price <= 0 || quantity < 0) {
      return res.status(400).json(errShape(400, "Price must be greater than 0 and quantity cannot be negative", "/api/products"));
    }

    const itemId = await productService.addProduct({ seller_id, seller_type, name, price, quantity, brand, description, category });
    res.status(201).json({ message: "Product added successfully", product_id: itemId });
  } catch (err) {
    console.log("ADD PRODUCT ERROR:", err.message);
    res.status(500).json(errShape(500, err.message, "/api/products"));
  }
});

// PUT /api/products/:id — FIX: requires JWT + ownership check (spec FR-3: only owner can edit)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { name, price, quantity } = req.body;

    if (!name || price === undefined || quantity === undefined) {
      return res.status(400).json(errShape(400, "name, price, and quantity are required", `/api/products/${req.params.id}`));
    }
    if (price <= 0 || quantity < 0) {
      return res.status(400).json(errShape(400, "Price must be greater than 0 and quantity cannot be negative", `/api/products/${req.params.id}`));
    }

    // FIX: ownership check — fetch the item first and verify the requester owns it
    const existing = await productService.getProductById(req.params.id);
    if (String(existing.seller_id) !== String(req.user.userId)) {
      return res.status(403).json(errShape(403, "You are not authorized to edit this product", `/api/products/${req.params.id}`));
    }

    await productService.updateProduct(req.params.id, req.body);
    res.status(200).json({ message: "Product updated successfully" });
  } catch (err) {
    const status = err.message === "Product not found" ? 404 : 500;
    res.status(status).json(errShape(status, err.message, `/api/products/${req.params.id}`));
  }
});

// DELETE /api/products/:id — FIX: requires JWT + ownership check (spec FR-3: only owner can delete)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    // FIX: ownership check — fetch the item first and verify the requester owns it
    const existing = await productService.getProductById(req.params.id);
    if (String(existing.seller_id) !== String(req.user.userId)) {
      return res.status(403).json(errShape(403, "You are not authorized to delete this product", `/api/products/${req.params.id}`));
    }

    await productService.deleteProduct(req.params.id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    const status = err.message === "Product not found" ? 404 : 500;
    res.status(status).json(errShape(status, err.message, `/api/products/${req.params.id}`));
  }
});

module.exports = router;