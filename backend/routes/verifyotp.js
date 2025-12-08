require('dotenv').config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// --------------------
// Verify OTP → create user + auto-login
// --------------------
router.post("/", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || otp.length !== 6) {
      return res.status(400).json({ error: "Email and valid 6-digit OTP required." });
    }

    // Check if the user already exists
    const [existingUsers] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "Account already exists for this email." });
    }

    // Fetch latest OTP record
    const [rows] = await db.query(
      "SELECT * FROM email_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "No OTP found for this email." });
    }

    const record = rows[0];
    const now = new Date();

    // Validate OTP
    if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP." });
    if (now > new Date(record.expires_at)) return res.status(400).json({ error: "OTP expired." });

    // Delete OTP to prevent reuse
    await db.query("DELETE FROM email_otps WHERE email = ?", [email]);

    // Get user info from OTP record
    const { name, contact_number, barangay_id, password, role, home_address } = record;

    if (!name || !password || !role) {
      return res.status(400).json({ error: "Missing registration info in OTP record." });
    }

    const accountType = role === "users" ? "active" : "pending";

    // Insert user safely
    const insertQuery = `
      INSERT INTO users 
      (name, email, contact_number, barangay_id, home_address, password, role, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [insertResult] = await db.query(insertQuery, [
      name,
      email,
      contact_number,
      barangay_id,
      home_address,
      password, // already hashed
      role,
      accountType,
    ]);

    // Fetch the newly created user using the correct PK (adjust if your table uses 'user_id' instead of 'id')
    const [userRows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = userRows[0];

    // Generate JWT for auto-login
    const token = jwt.sign(
      {
        user_id: user.user_id || user.id, // adapt to your DB column
        name: user.name,
        email: user.email,
        role: user.role,
        barangay_id: user.barangay_id,
        home_address: user.home_address,
      },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "🎉 Registration complete! Account created and logged in.",
      token,
      user: {
        id: user.user_id || user.id, // adapt to your DB column
        name: user.name,
        email: user.email,
        role: user.role,
        home_address: user.home_address,
      },
    });
  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    res.status(500).json({ error: "Server error during OTP verification." });
  }
});

module.exports = router;
