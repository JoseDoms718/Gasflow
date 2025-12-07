require('dotenv').config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// --------------------
// Verify OTP → create user
// --------------------
router.post("/", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || otp.length !== 6) {
      return res.status(400).json({ error: "Email and valid 6-digit OTP required." });
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
    if (record.otp !== otp)
      return res.status(400).json({ error: "Invalid OTP." });

    if (now > new Date(record.expires_at))
      return res.status(400).json({ error: "OTP expired." });

    // Delete OTP to prevent reuse
    await db.query("DELETE FROM email_otps WHERE email = ?", [email]);

    // Get user info (now includes home_address)
    const { 
      name, 
      contact_number, 
      barangay_id, 
      password, 
      role, 
      home_address 
    } = record;

    if (!name || !password || !role) {
      return res.status(400).json({ error: "Missing registration info in OTP record." });
    }

    const accountType = role === "users" ? "active" : "pending";
    const hashedPassword = password; // already hashed during OTP creation

    // Insert user (now includes home_address)
    await db.query(
      `INSERT INTO users 
       (name, email, contact_number, barangay_id, home_address, password, role, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        contact_number,
        barangay_id,
        home_address,   // ⬅️ ADDED
        hashedPassword,
        role,
        accountType,
      ]
    );

    res.json({
      success: true,
      message: "🎉 Registration complete! Account created.",
    });

  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    res.status(500).json({ error: "Server error during OTP verification." });
  }
});

module.exports = router;
