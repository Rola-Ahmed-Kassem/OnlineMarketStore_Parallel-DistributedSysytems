const path  = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:     process.env.USERS_DB_HOST     || "localhost",
  user:     process.env.USERS_DB_USER     || "root",
  password: process.env.USERS_DB_PASSWORD || "password",
  database: "products_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// const pool = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "MANgosAREgood_2027",
//   database: "products_db",
//   waitForConnections: true,
//   connectionLimit: 10
// });


// TEST DATABASE CONNECTION
pool.getConnection()
  .then(conn => {
    console.log("Connected to product_db successfully");
    conn.release();
  })
  .catch(err => {
    console.error("Database connection to product_db failed:");
    console.error(err.message);
  });

module.exports = pool;