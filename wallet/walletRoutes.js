
const express = require("express");
const router = express.Router();
const wallet = require("./walletService");
const { authenticateToken } = require("./authMiddleware");


// GET /api/v1/wallet/balance
// Now protected by the body-checking middleware!
router.get("/balance", authenticateToken, async (req, res) => {
  try {
    // Extracted safely from req.user (which read it from your request body)
    const currentUserId = req.user.userId; 
    
    const result = await wallet.getBalance(currentUserId);
    res.status(200).json(result);
  } catch (err) {
    res.status(404).json({ 
      timestamp: new Date().toISOString(),
      status: 404,
      error: "Not Found",
      message: err.message,
      path: "/api/v1/wallet/balance"
    });
  }
});

// GET /api/v1/wallet/transactions
// Now protected by the body-checking middleware!
router.get("/transactions", authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId; 
    
    const result = await wallet.getTransactions(currentUserId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: "Internal Server Error",
      message: err.message,
      path: "/api/v1/wallet/transactions"
    });
  }
});

// POST /api/v1/wallet/deposit
router.post("/deposit",authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId; 
    const { amount } = req.body;
    const result = await wallet.deposit(currentUserId, amount);
    res.status(200).json(result); 
  } catch (err) {
    res.status(400).json({ 
      timestamp: new Date().toISOString(),
      status: 400,
      error: "Bad Request",
      message: err.message,
      path: "/api/v1/wallet/deposit"
    });
  }
});

module.exports = router;