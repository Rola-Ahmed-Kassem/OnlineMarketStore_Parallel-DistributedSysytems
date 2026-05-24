// ============================================================
//  STORE SERVICE  — belongs to: Store Service
//  All users_db (stores table) logic lives here.
//  storeRoutes.js imports from here.
// ============================================================

const crypto = require("crypto");
const db     = require("../usersDb");

// ── Register a new external store ────────────────────────────────────────────
// Generates a plain API key returned once to the caller,
// and stores only its SHA-256 hash (apiKeyHash) in the DB —
// same pattern as password hashing: never store secrets in plain text.

async function registerStore({ storeName, ownerName, email }) {
  // Check duplicate email
  const [existing] = await db.query(
    `SELECT id FROM stores WHERE email = ? LIMIT 1`,
    [email]
  );
  if (existing.length > 0) {
    const err = new Error("A store with this email already exists.");
    err.statusCode = 409;
    throw err;
  }

  // Generate a secure random API key and hash it for storage
  const apiKey     = crypto.randomBytes(32).toString("hex"); // 64-char hex string
  const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const [result] = await db.query(
    `INSERT INTO stores (store_name, owner_name, email, api_key_hash)
     VALUES (?, ?, ?, ?)`,
    [storeName, ownerName, email || null, apiKeyHash]
  );

  return { storeId: result.insertId, apiKey }; // apiKey returned once — never again
}

// ── Validate an incoming x-api-key against stored hashes ─────────────────────
// Returns the store row if valid, throws if not found.

async function getStoreByApiKey(apiKey) {
  const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const [rows] = await db.query(
    `SELECT id, store_name, owner_name, email FROM stores WHERE api_key_hash = ? LIMIT 1`,
    [apiKeyHash]
  );

  if (rows.length === 0) {
    const err = new Error("Invalid API key.");
    err.statusCode = 401;
    throw err;
  }

  return rows[0];
}

module.exports = {
  registerStore,
  getStoreByApiKey,
};
