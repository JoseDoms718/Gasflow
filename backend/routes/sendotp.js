const express = require("express");
const router = express.Router();
const db = require("../config/db");
const sendEmail = require("../utils/sendEmail")
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const OtpEmailTemplate = require("../utils/OtpEmailTemplate"); // <-- Import template

// Philippine mobile number regex (+639XXXXXXXXX)
const PH_MOBILE_REGEX = /^\+639\d{9}$/;

// Helper: Normalize PH number
function normalizePHNumber(number) {
  if (!number) return null;
  number = number.trim();
  if (number.startsWith("0")) number = "+63" + number.slice(1);
  else if (!number.startsWith("+63")) number = "+63" + number.replace(/^(\+63|0)/, "");
  if (number.length > 13) number = number.slice(0, 13);
  return number;
}

/**
 * POST /send-otp
 * Handles sending, resending, and canceling OTPs.
 * Body: { email, action, name?, contact_number?, barangay_id?, password?, role? }
 */
router.post("/", async (req, res) => {
  let { name, email, contact_number, barangay_id, password, role, action } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    // ----------------------------
    // Cancel OTP
    // ----------------------------
    if (action === "cancel") {
      await db.query("DELETE FROM email_otps WHERE email = ?", [email]);
      return res.json({ success: true, message: "✅ OTP canceled successfully." });
    }

    // ----------------------------
    // Check existing OTP
    // ----------------------------
    const [existingOtp] = await db.query(
      "SELECT * FROM email_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    // ----------------------------
    // Resend OTP
    // ----------------------------
    if (action === "resend") {
      if (!existingOtp || existingOtp.length === 0) {
        return res.status(400).json({ error: "No previous OTP found. Please register again." });
      }

      const lastSent = new Date(existingOtp[0].created_at);
      const diffSeconds = (Date.now() - lastSent.getTime()) / 1000;
      if (diffSeconds < 60) {
        return res.status(429).json({ error: `⏳ Please wait ${Math.ceil(60 - diffSeconds)}s before resending OTP.` });
      }

      // Generate new OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Update OTP
      await db.query(
        "UPDATE email_otps SET otp = ?, expires_at = ?, created_at = NOW() WHERE email = ?",
        [otp, expiresAt, email]
      );

      // ✅ Send HTML email using template
      const htmlContent = OtpEmailTemplate({ name: existingOtp[0].name, otpCode: otp });
      await sendEmail(email, "Gasflow - OTP Verification", { html: htmlContent, text: `Hi ${existingOtp[0].name}, your OTP is ${otp}. It will expire in 5 minutes.` });

      return res.json({ success: true, message: "✅ OTP resent successfully!" });
    }

    // ----------------------------
    // First-time send OTP (registration)
    // ----------------------------
    if (!name || !contact_number || !barangay_id || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    contact_number = normalizePHNumber(contact_number);
    if (!PH_MOBILE_REGEX.test(contact_number)) {
      return res.status(400).json({ error: "Invalid mobile number. Use +639XXXXXXXXX format." });
    }

    // Prevent sending if email exists
    const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) return res.status(400).json({ error: "Email already exists." });

    // Validate barangay
    const [barangayExists] = await db.query("SELECT * FROM barangays WHERE barangay_id = ?", [barangay_id]);
    if (barangayExists.length === 0) return res.status(400).json({ error: "Invalid barangay selected." });

    // Rate-limit: 60s resend
    if (existingOtp && existingOtp.length > 0) {
      const lastSent = new Date(existingOtp[0].created_at);
      const diffSeconds = (Date.now() - lastSent.getTime()) / 1000;
      if (diffSeconds < 60) {
        return res.status(429).json({ error: `⏳ Please wait ${Math.ceil(60 - diffSeconds)}s before sending OTP.` });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    role = role || "users";

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Cleanup old OTPs
    await db.query("DELETE FROM email_otps WHERE email = ?", [email]);

    // Insert new OTP
    await db.query(
      `INSERT INTO email_otps 
      (email, otp, expires_at, created_at, name, barangay_id, contact_number, password, role)
      VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
      [email, otp, expiresAt, name, barangay_id, contact_number, hashedPassword, role]
    );

    // ✅ Send HTML email using template
    const htmlContent = OtpEmailTemplate({ name, otpCode: otp });
    await sendEmail(email, "Gasflow - OTP Verification", { html: htmlContent, text: `Hi ${name}, your OTP is ${otp}. It will expire in 5 minutes.` });

    res.json({ success: true, message: "✅ OTP sent! Please verify to complete registration." });

  } catch (err) {
    console.error("❌ Error handling OTP:", err);
    res.status(500).json({ error: "Failed to process OTP." });
  }
});

module.exports = router;
