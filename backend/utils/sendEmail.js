require("dotenv").config();
const nodemailer = require("nodemailer");
const path = require("path");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @param {string} to
 * @param {string} subject
 * @param {object} options { text, html, attachments }
 */
async function sendEmail(to, subject, { text, html, attachments = [] }) {
  try {
    if (!to || !subject || (!text && !html)) {
      throw new Error("Missing required email fields.");
    }

    await transporter.verify();

    // Always include logoWhite if the HTML uses it
    if (html && html.includes("cid:logoWhite")) {
      attachments.push({
        filename: "logoWhite.png",
        path: path.join(__dirname, "../../src/assets/design/LogoWhite.png"),
        cid: "logoWhite",
      });
    }

    const info = await transporter.sendMail({
      from: `"Gasflow" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments, // <-- NOW USING PASSED ATTACHMENTS
    });

    console.log("📧 Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    throw err;
  }
}

module.exports = sendEmail;
