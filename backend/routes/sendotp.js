require('dotenv').config();
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

//send otp route
router.post("/", async (req, res) => {
  let { name, email, contact_number, barangay_id, password, role, action, home_address } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    // Cancel OTP
    if (action === "cancel") {
      await db.query("DELETE FROM email_otps WHERE email = ?", [email]);
      return res.json({ success: true, message: "✅ OTP canceled successfully." });
    }

    const [existingOtp] = await db.query(
      "SELECT * FROM email_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    // Resend OTP
    if (action === "resend") {
      if (!existingOtp || existingOtp.length === 0) {
        return res.status(400).json({ error: "No previous OTP found. Please register again." });
      }

      const lastSent = new Date(existingOtp[0].created_at);
      const diff = (Date.now() - lastSent.getTime()) / 1000;
      if (diff < 60) {
        return res.status(429).json({ error: `⏳ Please wait ${Math.ceil(60 - diff)}s before resending OTP.` });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await db.query(
        "UPDATE email_otps SET otp = ?, expires_at = ?, created_at = NOW() WHERE email = ?",
        [otp, expiresAt, email]
      );

      const htmlContent = OtpEmailTemplate({
        name: existingOtp[0].name,
        otpCode: otp,
      });

      await sendEmail(
        email,
        "Gasflow - OTP Verification",
        { html: htmlContent, text: `Your OTP is ${otp}` }
      );

      return res.json({ success: true, message: "✅ OTP resent successfully!" });
    }

    // Registration — require all fields
    if (!name || !contact_number || !barangay_id || !password || !home_address) {
      return res.status(400).json({ error: "All fields are required." });
    }

    contact_number = normalizePHNumber(contact_number);
    if (!PH_MOBILE_REGEX.test(contact_number)) {
      return res.status(400).json({ error: "Invalid mobile number. Use +639XXXXXXXXX format." });
    }

    const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0)
      return res.status(400).json({ error: "Email already exists." });

    const [barangayCheck] = await db.query(
      "SELECT * FROM barangays WHERE barangay_id = ?",
      [barangay_id]
    );
    if (barangayCheck.length === 0)
      return res.status(400).json({ error: "Invalid barangay selected." });

    if (existingOtp && existingOtp.length > 0) {
      const lastSent = new Date(existingOtp[0].created_at);
      const diffSeconds = (Date.now() - lastSent.getTime()) / 1000;
      if (diffSeconds < 60) {
        return res.status(429).json({
          error: `⏳ Please wait ${Math.ceil(60 - diffSeconds)}s before sending OTP.`,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    role = role || "users";

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query("DELETE FROM email_otps WHERE email = ?", [email]);

    await db.query(
      `INSERT INTO email_otps 
      (email, otp, expires_at, created_at, name, barangay_id, contact_number, password, role, home_address)
      VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [email, otp, expiresAt, name, barangay_id, contact_number, hashedPassword, role, home_address]
    );

    const htmlContent = OtpEmailTemplate({ name, otpCode: otp });
    await sendEmail(email, "Gasflow - OTP Verification", {
      html: htmlContent,
      text: `Hi ${name}, your OTP is ${otp}.`,
    });

    res.json({
      success: true,
      message: "✅ OTP sent! Please verify your email.",
    });
  } catch (err) {
    console.error("❌ Error handling OTP:", err);
    res.status(500).json({ error: "Failed to process OTP." });
  }
});


module.exports = router;
