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
// GET retailers for logged-in branch manager
// ----------------------
router.get("/my-retailers", authMiddleware, async (req, res) => {
  try {
    // ✅ Only branch managers allowed
    if (!req.user || req.user.role !== "branch_manager") {
      return res.status(403).json({ error: "Forbidden: only branch managers" });
    }

    // ✅ Get branch manager's barangay_id from JWT
    const managerBarangayId = req.user.barangay_id;

    if (!managerBarangayId) {
      return res.status(400).json({ error: "Branch manager's barangay_id missing" });
    }

    console.log("Logged-in user:", req.user);

    // ✅ Fetch the municipality of the branch manager
    const [rows] = await queryDB(
      "SELECT municipality FROM barangays WHERE barangay_id = ?",
      [managerBarangayId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Branch manager's barangay not found" });
    }

    const municipality = rows[0].municipality;
    console.log("Branch manager's municipality:", municipality);

    // ✅ Fetch retailers in the same municipality
    const sql = `
      SELECT u.user_id, u.name, u.email, u.contact_number, u.type,
             b.barangay_name AS barangay, b.municipality
      FROM users u
      JOIN barangays b ON u.barangay_id = b.barangay_id
      WHERE u.role = 'retailer' AND LOWER(b.municipality) = LOWER(?)
      ORDER BY u.user_id DESC
    `;

    const [retailers] = await queryDB(sql, [municipality]);
    console.log("Retailers found:", retailers);

    res.status(200).json({ success: true, retailers });
  } catch (err) {
    console.error("❌ DB error fetching retailers:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// ----------------------
// POST: Add new retailer
// ----------------------
router.post("/add", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "branch_manager") {
      return res.status(403).json({ error: "Forbidden: only branch managers" });
    }

    const { name, barangay_id, email, contact_number, password } = req.body;

    if (!name || !barangay_id || !email || !contact_number || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Verify the barangay belongs to the same municipality as the manager
    const [barangay] = await queryDB(
      "SELECT municipality FROM barangays WHERE barangay_id = ?",
      [barangay_id]
    );
    if (barangay.length === 0) {
      return res.status(400).json({ error: "Invalid barangay_id" });
    }

    const managerBarangayId = req.user.barangay_id;
    const [managerBranch] = await queryDB(
      "SELECT municipality FROM barangays WHERE barangay_id = ?",
      [managerBarangayId]
    );
    const managerMunicipality = managerBranch[0].municipality;

    if (barangay[0].municipality !== managerMunicipality) {
      return res.status(400).json({
        error: "Cannot assign retailer to a barangay outside your municipality",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users 
      (name, barangay_id, email, contact_number, password, role, type)
      VALUES (?, ?, ?, ?, ?, 'retailer', 'active')
    `;
    const [result] = await queryDB(sql, [
      name,
      barangay_id,
      email,
      contact_number,
      hashedPassword,
    ]);

    // Fetch the new retailer including barangay info
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
      message: "✅ Retailer added successfully!",
      retailer: newRetailerRows[0],
    });
  } catch (err) {
    console.error("❌ Error adding retailer:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
