require('dotenv').config();
const nodemailer = require("nodemailer");
const path = require("path"); // ✅ Missing import

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
 * @param {object} options - { text, html }
 */
async function sendEmail(to, subject, { text, html }) {
  try {
    if (!to || !subject || (!text && !html)) {
      throw new Error("Missing email fields (to, subject, or body).");
    }

    await transporter.verify();
    console.log("✅ Email transporter verified successfully.");

    const info = await transporter.sendMail({
      from: `"Gasflow" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: "LogoBlue.png",
          path: path.join(__dirname, "../../src/assets/design/LogoBlue.png"),
          cid: "logo", // ✅ must match <img src="cid:logo">
        },
      ],
    });

    console.log(`📧 Email sent successfully to ${to}`);
    console.log(`🆔 Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);

    if (err.code === "EAUTH") {
      console.error("⚠️ Gmail authentication failed. Check EMAIL_USER and EMAIL_PASS in .env.");
    } else if (err.code === "ENOTFOUND") {
      console.error("⚠️ Network issue: Unable to reach Gmail SMTP servers.");
    }

    throw err;
  }
}

module.exports = sendEmail;
