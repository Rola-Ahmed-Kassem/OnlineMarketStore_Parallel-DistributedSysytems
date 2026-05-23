// ============================================================
//  ORDER ROUTES
//  No logic here — calls orderService and reportService.
//  Matches spec endpoints exactly:
//    POST /api/v1/orders/purchase
//    GET  /api/v1/orders/purchased
//    GET  /api/v1/orders/sold
//    GET  /api/v1/reports/transactions
//    GET  /api/v1/reports/sales
// ============================================================

const express       = require("express");
const router        = express.Router();
const { body, query, validationResult } = require("express-validator");
const rateLimit     = require("express-rate-limit");

const authenticateToken = require("../auth/authMiddleware");
const orderService      = require("./orderService");
const reportService     = require("./reportService");

// ── Helpers ───────────────────────────────────────────────────────────────────

const HTTP_STATUS_TEXT = {
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
  404: "Not Found",   409: "Conflict",     422: "Unprocessable Entity",
  500: "Internal Server Error",
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

function fmtOrderId(id) { return `ORD-${id}`; }
function fmtTxId(id)    { return `TX-${id}`;  }

function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return stdError(res, 422, errors.array().map(e => e.msg).join(" "), req.path);
      }
      next();
    },
  ];
}

// ── Rate limiter for purchase ─────────────────────────────────────────────────

const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many purchase requests. Please slow down." },
});

// ── Validation rules ──────────────────────────────────────────────────────────

const purchaseRules = validate([
  body("itemId").isInt({ gt: 0 }).withMessage("itemId must be a positive integer."),
  body("quantity").optional().isInt({ gt: 0 }).withMessage("quantity must be a positive integer."),
]);

const reportRules = validate([
  query("startDate").optional().isISO8601().withMessage("startDate must be a valid ISO date."),
  query("endDate").optional().isISO8601().withMessage("endDate must be a valid ISO date."),
]);

// ── POST /api/v1/orders/purchase ──────────────────────────────────────────────

router.post("/orders/purchase", authenticateToken, purchaseLimiter, purchaseRules, async (req, res) => {
  const buyerId  = req.user.userId;
  const itemId   = parseInt(req.body.itemId, 10);
  const quantity = parseInt(req.body.quantity || "1", 10);

  try {
    const result = await orderService.executePurchaseTransaction(buyerId, itemId, quantity);
    return res.status(200).json({
      message:           "Purchase completed successfully",
      orderId:           fmtOrderId(result.orderId),
      buyerId:           `USR-${buyerId}`,
      sellerId:          `USR-${result.sellerId}`,
      itemId:            `ITEM-${itemId}`,
      amountTransferred: result.amountTransferred,
    });
  } catch (err) {
    const map = {
      ITEM_NOT_FOUND:       [404, "Item not found."],
      ITEM_UNAVAILABLE:     [409, "Item is not available."],
      OUT_OF_STOCK:         [409, "Item is out of stock."],
      INSUFFICIENT_BALANCE: [409, "Insufficient balance."],
      NO_WALLET:            [404, "Wallet not found. Please make a deposit first."],
      COMPENSATION_ISSUED:  [500, err.message],
    };
    if (err.code && map[err.code]) {
      return stdError(res, map[err.code][0], map[err.code][1], req.path);
    }
    console.error("[purchase]", err);
    return stdError(res, 500, "Internal server error.", req.path);
  }
});

// ── GET /api/v1/orders/purchased ──────────────────────────────────────────────

router.get("/orders/purchased", authenticateToken, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || "20", 10), 100);
  const offset = Math.max(parseInt(req.query.offset || "0",  10), 0);
  try {
    const rows = await orderService.getPurchasedOrders(req.user.userId, limit, offset);
    return res.status(200).json({
      orders: rows.map(r => ({
        orderId:    fmtOrderId(r.id),
        sellerId:   `USR-${r.seller_id}`,
        itemId:     `ITEM-${r.item_id}`,
        quantity:   r.quantity,
        totalPrice: parseFloat(r.total_price),
        status:     r.status,
        date:       r.created_at,
      })),
    });
  } catch (err) {
    console.error("[getPurchasedOrders]", err);
    return stdError(res, 500, "Internal server error.", req.path);
  }
});

// ── GET /api/v1/orders/sold ───────────────────────────────────────────────────

router.get("/orders/sold", authenticateToken, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || "20", 10), 100);
  const offset = Math.max(parseInt(req.query.offset || "0",  10), 0);
  try {
    const rows = await orderService.getSoldOrders(req.user.userId, limit, offset);
    return res.status(200).json({
      orders: rows.map(r => ({
        orderId:    fmtOrderId(r.id),
        buyerId:    `USR-${r.buyer_id}`,
        itemId:     `ITEM-${r.item_id}`,
        quantity:   r.quantity,
        totalPrice: parseFloat(r.total_price),
        status:     r.status,
        date:       r.created_at,
      })),
    });
  } catch (err) {
    console.error("[getSoldOrders]", err);
    return stdError(res, 500, "Internal server error.", req.path);
  }
});

// ── GET /api/v1/reports/transactions?startDate=&endDate= ──────────────────────

router.get("/reports/transactions", authenticateToken, reportRules, async (req, res) => {
  if (req.user.userType !== "admin" && req.user.userType !== "owner") {
    return stdError(res, 403, "Access denied.", req.path);
  }
  try {
    const report = await reportService.getTransactionsReport(req.query.startDate, req.query.endDate);
    return res.status(200).json({
      ...report,
      transactions: report.transactions.map(r => ({
        transactionId: fmtTxId(r.id),
        orderId:       r.order_id > 0 ? fmtOrderId(r.order_id) : null,
        type:          r.type,
        fromUserId:    r.from_user_id ? `USR-${r.from_user_id}` : null,
        toUserId:      `USR-${r.to_user_id}`,
        amount:        parseFloat(r.amount),
        date:          r.created_at,
      })),
    });
  } catch (err) {
    console.error("[getTransactionsReport]", err);
    return stdError(res, 500, "Internal server error.", req.path);
  }
});

// ── GET /api/v1/reports/sales?startDate=&endDate= ────────────────────────────

router.get("/reports/sales", authenticateToken, reportRules, async (req, res) => {
  if (req.user.userType !== "admin" && req.user.userType !== "owner") {
    return stdError(res, 403, "Access denied.", req.path);
  }
  try {
    const report = await reportService.getSalesReport(req.query.startDate, req.query.endDate);
    return res.status(200).json({
      ...report,
      orders: report.orders.map(r => ({
        orderId:    fmtOrderId(r.id),
        buyerId:    `USR-${r.buyer_id}`,
        sellerId:   `USR-${r.seller_id}`,
        itemId:     `ITEM-${r.item_id}`,
        quantity:   r.quantity,
        totalPrice: parseFloat(r.total_price),
        date:       r.created_at,
      })),
    });
  } catch (err) {
    console.error("[getSalesReport]", err);
    return stdError(res, 500, "Internal server error.", req.path);
  }
});

module.exports = router;
