// ============================================================
//  ORDER SERVICE
//  Logic only — no Express, no HTTP.
//  Owns: orders table, transactions table
//  Calls: walletService, productService
// ============================================================

const db             = require("../financeDb");
const walletService  = require("../wallet/walletService");
const productService = require("../product/productService");

// ── Purchase flow ─────────────────────────────────────────────────────────────

async function executePurchaseTransaction(buyerId, itemId, quantity) {

  // 1. Check item — productService
  const productData = await productService.getItemWithInventory(itemId);

  if (!productData?.item) {
    const err = new Error("Item not found."); err.code = "ITEM_NOT_FOUND"; throw err;
  }

  const { item, inventory } = productData;

  if (item.status !== "AVAILABLE") {
    const err = new Error("Item is not available for purchase."); err.code = "ITEM_UNAVAILABLE"; throw err;
  }
  if (!inventory || inventory.quantity < quantity) {
    const err = new Error("Insufficient stock for requested quantity."); err.code = "OUT_OF_STOCK"; throw err;
  }

  const sellerId   = item.seller_id;
  const totalPrice = parseFloat(item.price) * quantity;

  // 2. Check buyer balance — walletService
  let buyerWallet;
  try {
    buyerWallet = await walletService.getBalance(buyerId);
  } catch {
    const err = new Error("Wallet not found. Please make a deposit first."); err.code = "NO_WALLET"; throw err;
  }

  if (parseFloat(buyerWallet.cashBalance) < totalPrice) {
    const err = new Error("Insufficient balance."); err.code = "INSUFFICIENT_BALANCE"; throw err;
  }

  // 3. Create order in PENDING state (orders table — owned by this service)
  const conn = await db.getConnection();
  let orderId, txId;

  try {
    await conn.beginTransaction();

    const [orderResult] = await conn.execute(
      `INSERT INTO orders (buyer_id, seller_id, item_id, quantity, total_price, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [buyerId, sellerId, itemId, quantity, totalPrice]
    );
    orderId = orderResult.insertId;

    // 4. Move money — walletService
    await walletService.deductBalance(buyerId, totalPrice);
    await walletService.addBalance(sellerId, totalPrice);

    // 5. Record transaction + complete order
    const [txResult] = await conn.execute(
      `INSERT INTO transactions (order_id, from_user_id, to_user_id, amount, type)
       VALUES (?, ?, ?, ?, 'PURCHASE')`,
      [orderId, buyerId, sellerId, totalPrice]
    );
    txId = txResult.insertId;

    await conn.execute(`UPDATE orders SET status = 'COMPLETED' WHERE id = ?`, [orderId]);
    await conn.commit();

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // 6. Update product availability — productService
  try {
    await productService.markItemSold(itemId, quantity);
  } catch (productErr) {
    console.error("[purchase] products_db update failed – compensating:", productErr.message);
    await _compensate(orderId, buyerId, sellerId, totalPrice);
    const err = new Error("Purchase partially failed. A full refund has been issued.");
    err.code = "COMPENSATION_ISSUED";
    throw err;
  }

  return { orderId, txId, amountTransferred: totalPrice, sellerId };
}

// Reverses wallet moves and marks order FAILED
async function _compensate(orderId, buyerId, sellerId, amount) {
  try {
    await walletService.addBalance(buyerId, amount);
    await walletService.deductBalance(sellerId, amount);

    await db.query(
      `INSERT INTO transactions (order_id, from_user_id, to_user_id, amount, type)
       VALUES (?, ?, ?, ?, 'REFUND')`,
      [orderId, sellerId, buyerId, amount]
    );
    await db.query(`UPDATE orders SET status = 'FAILED' WHERE id = ?`, [orderId]);

    console.log(`[compensation] Refund of ${amount} issued for order ${orderId}.`);
  } catch (compErr) {
    console.error(
      `[compensation] CRITICAL: Refund failed for order ${orderId}! Manual reconciliation needed.`,
      compErr
    );
  }
}

// ── Order history ─────────────────────────────────────────────────────────────

async function getPurchasedOrders(userId, limit, offset) {
  const [rows] = await db.query(
    `SELECT id, seller_id, item_id, quantity, total_price, status, created_at
       FROM orders
      WHERE buyer_id = ? AND status = 'COMPLETED'
      ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return rows;
}

async function getSoldOrders(userId, limit, offset) {
  const [rows] = await db.query(
    `SELECT id, buyer_id, item_id, quantity, total_price, status, created_at
       FROM orders
      WHERE seller_id = ? AND status = 'COMPLETED'
      ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return rows;
}

module.exports = {
  executePurchaseTransaction,
  getPurchasedOrders,
  getSoldOrders,
};
