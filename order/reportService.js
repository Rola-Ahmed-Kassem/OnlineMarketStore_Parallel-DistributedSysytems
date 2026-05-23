// ============================================================
//  REPORT SERVICE
//  Logic only — no Express, no HTTP.
//  Owns: read-only queries on orders + transactions tables
// ============================================================

const db = require("../financeDb");

// GET /api/v1/reports/transactions?startDate=&endDate=
async function getTransactionsReport(startDate, endDate) {
  const params = [];
  let where = "";

  if (startDate) { where += " AND t.created_at >= ?"; params.push(startDate); }
  if (endDate)   { where += " AND t.created_at <= ?"; params.push(endDate); }

  const [txRows] = await db.query(
    `SELECT t.id, t.order_id, t.from_user_id, t.to_user_id, t.amount, t.type, t.created_at
       FROM transactions t
      WHERE 1=1 ${where}
      ORDER BY t.created_at DESC
      LIMIT 500`,
    params
  );

  const [sumRow] = await db.query(
    `SELECT COUNT(*) AS total_count, COALESCE(SUM(amount), 0) AS total_amount
       FROM transactions
      WHERE type = 'PURCHASE' ${where}`,
    params
  );

  return {
    reportType:        "TRANSACTIONS",
    startDate:         startDate || null,
    endDate:           endDate   || null,
    totalTransactions: parseInt(sumRow[0].total_count, 10),
    totalSalesAmount:  parseFloat(sumRow[0].total_amount),
    transactions:      txRows,
  };
}

// GET /api/v1/reports/sales?startDate=&endDate=
async function getSalesReport(startDate, endDate) {
  const params = [];
  let where = "";

  if (startDate) { where += " AND o.created_at >= ?"; params.push(startDate); }
  if (endDate)   { where += " AND o.created_at <= ?"; params.push(endDate); }

  const [rows] = await db.query(
    `SELECT o.id, o.buyer_id, o.seller_id, o.item_id, o.quantity, o.total_price, o.status, o.created_at
       FROM orders o
      WHERE o.status = 'COMPLETED' ${where}
      ORDER BY o.created_at DESC
      LIMIT 500`,
    params
  );

  const [sumRow] = await db.query(
    `SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_price), 0) AS revenue
       FROM orders
      WHERE status = 'COMPLETED' ${where}`,
    params
  );

  return {
    reportType:   "SALES",
    startDate:    startDate || null,
    endDate:      endDate   || null,
    totalOrders:  parseInt(sumRow[0].total_orders, 10),
    totalRevenue: parseFloat(sumRow[0].revenue),
    orders:       rows,
  };
}

module.exports = {
  getTransactionsReport,
  getSalesReport,
};
