
// ============================================================
//  INVENTORY ROUTES  — belongs to: Product Service
//  Handles: view inventory, update item quantity (owner only)
//  No SQL here — logic is in inventoryService.js
// ============================================================

const express          = require("express");
const router           = express.Router();
const inventoryService = require("./inventoryService");
const productService   = require("./productService");
const { authenticateToken } = require("./authMiddleware");

// ── Helpers ───────────────────────────────────────────────────────────────────

const HTTP_STATUS_TEXT = {
  400: "Bad Request", 403: "Forbidden", 404: "Not Found", 500: "Internal Server Error",
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

// ── GET /api/v1/inventory — authenticated ─────────────────────────────────────

router.get("/", authenticateToken, async (req, res) => {
  try {
    const rows = await inventoryService.getInventory();
    return res.status(200).json({
      message: "Inventory retrieved successfully",
      count:   rows.length,
      data:    rows.map(r => ({
        itemId:      `ITEM-${r.item_id}`,
        name:        r.name,
        // FIX: prefix depends on seller_type — STORE sellers get STORE-X not USR-X
        sellerId:    r.seller_type === "STORE" ? `STORE-${r.seller_id}` : `USR-${r.seller_id}`,
        sellerType:  r.seller_type,
        price:       parseFloat(r.price),
        itemStatus:  r.item_status,
        quantity:    r.quantity    ?? 0,
        stockStatus: r.stock_status ?? "OUT_OF_STOCK",
      })),
    });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

// ── PATCH /api/v1/inventory/:itemId — authenticated + owner only ──────────────

router.patch("/:itemId", authenticateToken, async (req, res) => {
  const itemId   = parseInt(req.params.itemId, 10);
  const { quantity } = req.body;

  if (quantity === undefined || quantity === null) {
    return stdError(res, 400, "quantity is required.", req.path);
  }

  try {
    // Ownership check — only the seller who listed the item can update its stock
    const item = await productService.getProductById(itemId);
    if (String(item.seller_id) !== String(req.user.userId)) {
      return stdError(res, 403, "You are not authorized to update this item's inventory.", req.path);
    }

    await inventoryService.updateInventoryQuantity(itemId, quantity);
    return res.status(200).json({ message: "Inventory updated successfully." });
  } catch (err) {
    return stdError(res, err.statusCode || 500, err.message, req.path);
  }
});

module.exports = router;
