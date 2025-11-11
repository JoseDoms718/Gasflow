const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "Users",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ✅ Turn it into a Promise-based pool
const db = pool.promise();

db.getConnection()
  .then((connection) => {
    console.log("✅ Connected to MySQL database.");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

module.exports = db;
