// ============================================================
//  USER SERVICE  — belongs to: Users Service
//  All users_db logic lives here.
//  userRoutes.js imports from here.
// ============================================================

const bcrypt = require("bcrypt");
const db     = require("../usersDb");

// ── GET user by id ────────────────────────────────────────────────────────────

async function getUserById(id) {
  const [rows] = await db.execute(
    `SELECT id, name, email, phone, created_at FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  if (rows.length === 0) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

// ── UPDATE profile (name and/or phone) ───────────────────────────────────────

async function updateProfile(id, { name, phone }) {
  const fields = [];
  const values = [];

  if (name)                { fields.push("name = ?");  values.push(name); }
  if (phone !== undefined) { fields.push("phone = ?"); values.push(phone || null); }

  values.push(id);
  await db.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
}

// ── CHANGE password ───────────────────────────────────────────────────────────

async function changePassword(id, currentPassword, newPassword) {
  const [rows] = await db.execute(
    `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  if (rows.length === 0) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!match) {
    const err = new Error("Current password is incorrect.");
    err.statusCode = 401;
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, id]);
}

// ── DELETE account ────────────────────────────────────────────────────────────

async function deleteAccount(id) {
  await db.execute(`DELETE FROM users WHERE id = ?`, [id]);
}

module.exports = {
  getUserById,
  updateProfile,
  changePassword,
  deleteAccount,
};
