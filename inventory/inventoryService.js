// ============================================================
//  INVENTORY SERVICE  — belongs to: Product Service
//  All inventory table logic lives here.
//  inventoryRoutes.js imports from here.
// ============================================================

const db = require("../productsDb");

// ── GET full inventory (all items + their stock status) ───────────────────────
// Joins items and inventory so the caller gets a complete picture.

async function getInventory() {
  const [rows] = await db.query(
    `SELECT 
       i.id         AS item_id,
       i.name,
       i.seller_id,
       i.seller_type,
       i.price,
       i.status     AS item_status,
       inv.quantity,
       inv.status   AS stock_status
     FROM items i
     LEFT JOIN inventory inv ON inv.item_id = i.id
     ORDER BY i.id DESC`
  );
  return rows;
}

// ── GET inventory for a specific seller (used by /my-items context) ───────────

async function getInventoryBySeller(sellerId) {
  const [rows] = await db.query(
    `SELECT
       i.id         AS item_id,
       i.name,
       i.price,
       i.status     AS item_status,
       inv.quantity,
       inv.status   AS stock_status
     FROM items i
     LEFT JOIN inventory inv ON inv.item_id = i.id
     WHERE i.seller_id = ?
     ORDER BY i.id DESC`,
    [sellerId]
  );
  return rows;
}

// ── PATCH inventory quantity for a specific item ──────────────────────────────
// Only updates quantity and recalculates stock status.
// Ownership is enforced in the route before calling this.

async function updateInventoryQuantity(itemId, quantity) {
  if (quantity < 0) {
    const err = new Error("Quantity cannot be negative.");
    err.statusCode = 400;
    throw err;
  }

  const stockStatus = quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK";

  const [result] = await db.query(
    `UPDATE inventory
        SET quantity = ?, status = ?
      WHERE item_id = ?`,
    [quantity, stockStatus, itemId]
  );

  if (result.affectedRows === 0) {
    const err = new Error("Inventory record not found.");
    err.statusCode = 404;
    throw err;
  }

  // Keep items table quantity in sync
  await db.query(
    `UPDATE items SET quantity = ? WHERE id = ?`,
    [quantity, itemId]
  );
}

module.exports = {
  getInventory,
  getInventoryBySeller,
  updateInventoryQuantity,
};
