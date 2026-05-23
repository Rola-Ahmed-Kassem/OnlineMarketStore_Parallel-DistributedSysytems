// ============================================================
//  PRODUCT SERVICE
//  All products_db logic lives here.
//  productRoutes.js and transactionService.js both import from here.
// ============================================================

const db = require("../productsDb"); // products_db pool


// ── GET all items listed by a specific seller (for /my-items route) ───────────
async function getProductsBySeller(sellerId) {
  const [rows] = await db.query(
    `SELECT * FROM items WHERE seller_id = ? ORDER BY id DESC`,
    [sellerId]
  );
  return rows;
}
// GET all items, optional search by name/brand/category
async function getAllProducts(search) {
  let sql    = "SELECT * FROM items";
  let values = [];

  if (search) {
    sql   += " WHERE name LIKE ? OR brand LIKE ? OR category LIKE ?";
    values = [`%${search}%`, `%${search}%`, `%${search}%`];
  }

  sql += " ORDER BY id DESC";

  const [products] = await db.query(sql, values);
  return products;
}

// GET one item by id
async function getProductById(id) {
  const [rows] = await db.query(
    "SELECT * FROM items WHERE id = ?",
    [id]
  );
  if (rows.length === 0) throw new Error("Product not found");
  return rows[0];
}

// POST — add new item + inventory row
async function addProduct({ seller_id, seller_type, name, brand, description, price, quantity, category }) {
  const [result] = await db.query(
    `INSERT INTO items
     (seller_id, seller_type, name, brand, description, price, quantity, category, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [seller_id, seller_type, name, brand || null, description || null, price, quantity, category || null, "AVAILABLE"]
  );

  const itemId = result.insertId;

  // Create matching inventory row
  await db.query(
    `INSERT INTO inventory (item_id, owner_id, quantity, status)
     VALUES (?, ?, ?, ?)`,
    [itemId, seller_id, quantity, quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK"]
  );

  return itemId;
}

// PUT — update item by id
async function updateProduct(id, { name, brand, description, price, quantity, category, status }) {
  const [result] = await db.query(
    `UPDATE items
        SET name = ?, brand = ?, description = ?, price = ?,
            quantity = ?, category = ?, status = ?
      WHERE id = ?`,
    [name, brand || null, description || null, price, quantity, category || null, status || "AVAILABLE", id]
  );
  if (result.affectedRows === 0) throw new Error("Product not found");
}

// DELETE — remove item by id
async function deleteProduct(id) {
  const [result] = await db.query(
    "DELETE FROM items WHERE id = ?",
    [id]
  );
  if (result.affectedRows === 0) throw new Error("Product not found");
}

// GET item + its inventory row (used by transactionService for purchase checks)
async function getItemWithInventory(itemId) {
  const [itemRows] = await db.query(
    `SELECT id, seller_id, seller_type, name, price, quantity, status
       FROM items WHERE id = ? LIMIT 1`,
    [itemId]
  );
  if (itemRows.length === 0) return null;

  const [invRows] = await db.query(
    `SELECT item_id, owner_id, quantity, status
       FROM inventory WHERE item_id = ? LIMIT 1`,
    [itemId]
  );

  return { item: itemRows[0], inventory: invRows[0] || null };
}

// Mark item as sold and reduce inventory (used by transactionService after payment)
async function markItemSold(itemId, quantity) {
  await db.query(
    `UPDATE items
        SET status = 'SOLD', quantity = quantity - ?
      WHERE id = ? AND status = 'AVAILABLE'`,
    [quantity, itemId]
  );
  await db.query(
    `UPDATE inventory
        SET quantity = quantity - ?,
            status   = CASE WHEN quantity - ? <= 0 THEN 'OUT_OF_STOCK' ELSE 'IN_STOCK' END
      WHERE item_id = ?`,
    [quantity, quantity, itemId]
  );
}

module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  getItemWithInventory,
  markItemSold,
};
