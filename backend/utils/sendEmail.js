// backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

// 🧩 Create transporter using Gmail + App Password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email using the configured transporter
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Plain text body
 */
async function sendEmail(to, subject, text) {
  try {
    // ✅ Basic validation
    if (!to || !subject || !text) {
      throw new Error("Missing email fields (to, subject, or text).");
    }

    // ✅ Verify transporter before sending (helps catch Gmail auth issues)
    await transporter.verify();
    console.log("✅ Email transporter verified successfully.");

    // ✅ Send the email
    const info = await transporter.sendMail({
      from: `"Gasflow" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log(`📧 Email sent successfully to ${to}`);
    console.log(`🆔 Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌ Email sending failed:");
    console.error(err.message);

    // Add more specific error details for Gmail issues
    if (err.code === "EAUTH") {
      console.error("⚠️ Gmail authentication failed. Check EMAIL_USER and EMAIL_PASS in .env.");
    } else if (err.code === "ENOTFOUND") {
      console.error("⚠️ Network issue: Unable to reach Gmail SMTP servers.");
    }

    throw err; // Re-throw for route-level handling
  }
}

module.exports = sendEmail;
