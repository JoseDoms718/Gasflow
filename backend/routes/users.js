require('dotenv').config();
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

// ✅ Philippine mobile number regex (+639XXXXXXXXX)
const PH_MOBILE_REGEX = /^\+639\d{9}$/;

// ✅ Helper: Normalize PH number
function normalizePHNumber(number) {
  if (!number) return null;
  number = number.trim();

  if (number.startsWith("0")) {
    number = "+63" + number.slice(1);
  } else if (!number.startsWith("+63")) {
    number = "+63" + number.replace(/^(\+63|0)/, "");
  }

  if (number.length > 13) number = number.slice(0, 13);
  return number;
}


router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { name, email, contact_number, password, role, type, home_address, barangay_id } = req.body;

    // Required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password, and role are required." });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Normalize / validate PH number
    let normalizedContact = null;
    if (contact_number) {
      normalizedContact = normalizePHNumber(contact_number);
      if (!PH_MOBILE_REGEX.test(normalizedContact)) {
        return res.status(400).json({
          error: "Invalid mobile format. Use +639XXXXXXXXX (PH format).",
        });
      }
    }

    // Check duplicate email
    const [existing] = await conn.query("SELECT email FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists." });
    }

    // Validate barangay
    if (barangay_id) {
      const [barangay] = await conn.query(
        "SELECT * FROM barangays WHERE barangay_id = ?",
        [barangay_id]
      );
      if (barangay.length === 0) {
        return res.status(400).json({ error: "Invalid barangay selected." });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userType = type || "pending";

    await conn.beginTransaction();

    // Create user with home_address
    const [result] = await conn.query(
      `INSERT INTO users (name, email, contact_number, password, role, type, home_address, barangay_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, normalizedContact, hashedPassword, role, userType, home_address || null, barangay_id || null]
    );

    const userId = result.insertId;

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      user_id: userId,
    });

  } catch (error) {
    console.error("❌ Error adding user:", error);
    await conn.rollback();
    res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
});


// --------------------
// Fetch all users
// --------------------
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query(
      `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.contact_number,
        u.role,
        u.type,
        u.created_at,
        u.home_address,      -- added this
        u.barangay_id,
        b.barangay_name,
        b.municipality
      FROM users u
      LEFT JOIN barangays b 
        ON u.barangay_id = b.barangay_id
      ORDER BY u.user_id DESC
      `
    );

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// ✅ Edit user details
router.put("/:id", async (req, res) => {
  const userId = req.params.id;
  const fields = req.body;

  const allowed = ["name", "email", "contact_number", "barangay_id", "role", "type", "password", "home_address"];
  const updates = {};

  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    // Hash password if updating
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // Normalize contact number if present
    if (updates.contact_number) {
      updates.contact_number = normalizePHNumber(updates.contact_number);
      if (!PH_MOBILE_REGEX.test(updates.contact_number)) {
        return res
          .status(400)
          .json({ error: "Invalid mobile format. Use +639XXXXXXXXX (PH format)" });
      }
    }

    // Validate barangay_id if present
    if (updates.barangay_id) {
      const [barangayExists] = await db.query(
        "SELECT * FROM barangays WHERE barangay_id = ?",
        [updates.barangay_id]
      );
      if (barangayExists.length === 0) {
        return res.status(400).json({ error: "Invalid barangay selected" });
      }
    }

    // Dynamic query builder
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);

    const sql = `UPDATE users SET ${setClause} WHERE user_id = ?`;
    const [result] = await db.query(sql, [...values, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Change user password
router.put("/:id/password", async (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await db.query("UPDATE users SET password = ? WHERE user_id = ?", [
      hashedPassword,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("❌ Error updating password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
