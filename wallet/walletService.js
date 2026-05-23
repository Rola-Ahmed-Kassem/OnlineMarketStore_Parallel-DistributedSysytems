

 const db = require("../financeDb"); // This is your pool

// Deposit money (Keep this as is, it's correct because it needs a transaction)
async function deposit(userId, amount) {
    if (!userId) {
    throw new Error("userId is required");
  }

  // 2. Check amount exists
  if (amount === undefined || amount === null) {
    throw new Error("amount is required");
  }

  // 3. Convert to number (VERY IMPORTANT for API requests)
  amount = Number(amount);

  // 4. Check if amount is a valid number
  if (isNaN(amount)) {
    throw new Error("amount must be a valid number");
  }

  // 5. Check type (extra safety)
  if (typeof amount !== "number") {
    throw new Error("amount must be a number");
  }

  // 6. Check positive value
  if (amount <= 0) {
    throw new Error("amount must be greater than 0");
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Update wallet
    

    await conn.execute(
    `INSERT INTO wallets (user_id, cash_balance)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
    cash_balance = cash_balance + VALUES(cash_balance)`,
    [userId, amount]
    );

    // 2. Insert transaction record
    await conn.execute(
      `INSERT INTO transactions (order_id, from_user_id, to_user_id, amount, type)
       VALUES (0, NULL, ?, ?, 'DEPOSIT')`,
      [userId, amount]
    );
    const [walletRows] = await conn.execute(
      `SELECT cash_balance FROM wallets WHERE user_id = ?`,
      [userId]
    )

    await conn.commit();
    conn.release();

    return {
      "message": "Deposit completed successfully",
      "newBalance": walletRows[0].cash_balance};
  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }
}

// Get balance (FIXED: Using db.query directly on the pool)
async function getBalance(userId) {
  // Use .query directly on the pool wrapper for simple SELECTs
  const [rows] = await db.query(
    `SELECT cash_balance FROM wallets WHERE user_id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    throw new Error("Wallet not found");
  }

  return { cashBalance: rows[0].cash_balance };
}

// Get transactions (FIXED: Using db.query directly on the pool)
async function getTransactions(userId) {
  const [rows] = await db.query(
    `SELECT * FROM transactions 
     WHERE from_user_id = ? OR to_user_id = ?
     ORDER BY created_at DESC`,
    [userId, userId]
  );

  return rows;
}
//  DEDUCT BALANCE (For the Buyer)
async function deductBalance(userId, amount) {
  if (!userId || !amount || amount <= 0) {
    throw new Error("Invalid userId or amount parameters");
  }

  // Check if buyer has enough cash first
  const [rows] = await db.query(
    `SELECT cash_balance FROM wallets WHERE user_id = ?`,
    [userId]
  );

  if (rows.length === 0 || rows[0].cash_balance < amount) {
    throw new Error("Insufficient balance"); // Exact error string from Section 4.8
  }

  // Deduct the money safely
  await db.query(
    `UPDATE wallets 
     SET cash_balance = cash_balance - ?, updated_at = NOW() 
     WHERE user_id = ?`,
    [amount, userId]
  );

  return { message: "Deduction successful" };
}

//  ADD BALANCE (For the Seller)
async function addBalance(userId, amount) {
  if (!userId || !amount || amount <= 0) {
    throw new Error("Invalid userId or amount parameters");
  }

  // Update their wallet, or create it if it doesn't exist yet
  await db.query(
    `INSERT INTO wallets (user_id, cash_balance, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
     cash_balance = cash_balance + VALUES(cash_balance), updated_at = NOW()`,
    [userId, amount]
  );

  return { message: "Credit successful" };
}

module.exports = {
  deposit,
  getBalance,
  getTransactions,
  deductBalance,
  addBalance
};