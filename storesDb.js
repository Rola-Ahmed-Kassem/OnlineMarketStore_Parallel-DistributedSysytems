// ============================================================
//  STORES DB  — belongs to: Store Service
//  Points to users_db — stores table lives in Users DB
//  per the distributed schema in the project report.
// ============================================================

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "password",
  database: "users_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then(conn => {
    console.log("Connected to users_db (stores) successfully");
    conn.release();
  })
  .catch(err => {
    console.error("Database connection failed (storesDb):");
    console.error(err.message);
  });

module.exports = pool;
