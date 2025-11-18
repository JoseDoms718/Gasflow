require('dotenv').config();
const express = require("express");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/authtoken");

const router = express.Router();

// ----------------------
// Helper to query DB using promises
// ----------------------
function queryDB(sql, params = []) {
  return db.query(sql, params);
}

// ----------------------
// GET: Retailers for logged-in branch manager
// ----------------------
router.get("/my-retailers", authMiddleware, async (req, res) => {
  try {
    // Only branch managers allowed
    if (!req.user || req.user.role !== "branch_manager") {
      return res.status(403).json({ success: false, error: "Forbidden: only branch managers" });
    }

    const managerBarangayId = req.user.barangay_id;

    if (!managerBarangayId) {
      return res.status(400).json({ success: false, error: "Branch manager's barangay_id missing" });
    }

    // Get manager's municipality
    const [rows] = await queryDB(
      "SELECT municipality FROM barangays WHERE barangay_id = ?",
      [managerBarangayId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Branch manager's barangay not found" });
    }

    const municipality = rows[0].municipality;

    // Fetch retailers in the same municipality
    const sql = `
      SELECT u.user_id, u.name, u.email, u.contact_number, u.type,
             b.barangay_name AS barangay, b.municipality
      FROM users u
      JOIN barangays b ON u.barangay_id = b.barangay_id
      WHERE u.role = 'retailer' AND LOWER(b.municipality) = LOWER(?)
      ORDER BY u.user_id DESC
    `;

    const [retailers] = await queryDB(sql, [municipality]);

    res.status(200).json({ success: true, retailers });
  } catch (err) {
    console.error("❌ DB error fetching retailers:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ----------------------
// POST: Add new retailer
// ----------------------
router.post("/add", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "branch_manager") {
      return res.status(403).json({ success: false, error: "Forbidden: only branch managers" });
    }

    const { name, barangay_id, email, contact_number, password } = req.body;

    if (!name || !barangay_id || !email || !contact_number || !password) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // Verify barangay exists
    const [barangayRows] = await queryDB(
      "SELECT municipality FROM barangays WHERE barangay_id = ?",
      [barangay_id]
    );
    if (!barangayRows || barangayRows.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid barangay_id" });
    }

    // Verify same municipality
    const managerBarangayId = req.user.barangay_id;
    const [managerRows] = await queryDB(
      "SELECT municipality FROM barangays WHERE barangay_id = ?",
      [managerBarangayId]
    );
    const managerMunicipality = managerRows[0].municipality;

    if (barangayRows[0].municipality !== managerMunicipality) {
      return res.status(400).json({
        success: false,
        error: "Cannot assign retailer to a barangay outside your municipality",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert retailer
    const insertSql = `
      INSERT INTO users 
      (name, barangay_id, email, contact_number, password, role, type)
      VALUES (?, ?, ?, ?, ?, 'retailer', 'active')
    `;
    const [result] = await queryDB(insertSql, [
      name,
      barangay_id,
      email,
      contact_number,
      hashedPassword,
    ]);

    // Fetch newly created retailer with barangay info
    const [newRetailerRows] = await queryDB(
      `
      SELECT u.user_id, u.name, u.email, u.contact_number, u.type,
             b.barangay_name AS barangay, b.municipality
      FROM users u
      JOIN barangays b ON u.barangay_id = b.barangay_id
      WHERE u.user_id = ?
      `,
      [result.insertId]
    );

    res.status(200).json({
      success: true,
      message: "Retailer added successfully!",
      retailer: newRetailerRows[0],
    });
  } catch (err) {
    console.error("❌ Error adding retailer:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
