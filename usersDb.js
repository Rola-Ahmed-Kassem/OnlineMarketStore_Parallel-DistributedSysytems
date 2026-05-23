const mysql = require("mysql2/promise");


const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "password",
  database: "users_db",
  waitForConnections: true,
  connectionLimit: 10
});


// TEST DATABASE CONNECTION
pool.getConnection()
  .then(conn => {
    console.log("Connected to users_db successfully");
    conn.release();
  })
  .catch(err => {
    console.error("Database connection failed:");
    console.error(err.message);
  });

module.exports = pool;