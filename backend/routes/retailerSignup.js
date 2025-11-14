const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authenticateToken = require("../middleware/authtoken");

// Build the upload path
const uploadPath = path.join(__dirname, "../uploads/retailer/requiredDocs");

// Setup multer for dynamic file fields
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// -----------------------------
// ✅ Retailer Pre-registration
// -----------------------------
router.post("/", upload.any(), async (req, res) => {
  try {
    const { name, email, password, contact_number, municipality, barangay } = req.body;

    if (!name || !email || !password || !municipality || !barangay) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [existing] = await db.query("SELECT * FROM email_otps WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "This email is already registered or pending verification." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO email_otps 
        (email, name, barangay_id, contact_number, password, role) 
        VALUES (?, ?, ?, ?, ?, ?)`,
      [email, name, barangay, contact_number, hashedPassword, "retailer"]
    );

    const otpId = result.insertId;

    // Save uploaded documents dynamically
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const relativePath = path.relative(path.join(__dirname, "../"), file.path).replace(/\\/g, "/");
        await db.query(
          "INSERT INTO otp_images (otp_id, type, image_url) VALUES (?, ?, ?)",
          [otpId, file.fieldname, relativePath] // fieldname matches your permit keys
        );
      }
    }

    res.json({
      success: true,
      message: "🎉 Registration info submitted. Please wait for verification.",
    });
  } catch (err) {
    console.error("❌ Retailer pre-registration error:", err);
    if (err.code === "ER_DUP_ENTRY" && err.sqlMessage.includes("email")) {
      return res.status(400).json({ error: "This email is already registered or pending verification." });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------
// ✅ Approve Retailer
// -----------------------------
router.post("/approve/:otpId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admins only." });
    }

    const { otpId } = req.params;
    const [otpRecords] = await db.query("SELECT * FROM email_otps WHERE id = ?", [otpId]);
    if (otpRecords.length === 0) return res.status(404).json({ error: "Pending registration not found." });

    const otpData = otpRecords[0];

    await db.query(
      `INSERT INTO users 
        (name, email, contact_number, barangay_id, password, role, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [otpData.name, otpData.email, otpData.contact_number, otpData.barangay_id, otpData.password, otpData.role, "active"]
    );

    await db.query("DELETE FROM email_otps WHERE id = ?", [otpId]);

    res.json({ success: true, message: "✅ Retailer approved successfully." });
  } catch (err) {
    console.error("❌ Approve retailer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------
// ✅ Reject Retailer
// -----------------------------
router.post("/reject/:otpId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admins only." });
    }

    const { otpId } = req.params;

    const [otpRecords] = await db.query("SELECT * FROM email_otps WHERE id = ?", [otpId]);
    if (otpRecords.length === 0) return res.status(404).json({ error: "Pending registration not found." });

    const [images] = await db.query("SELECT * FROM otp_images WHERE otp_id = ?", [otpId]);

    for (let img of images) {
      const filePath = path.join(__dirname, "../", img.image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.query("DELETE FROM otp_images WHERE otp_id = ?", [otpId]);
    await db.query("DELETE FROM email_otps WHERE id = ?", [otpId]);

    res.json({ success: true, message: "❌ Retailer registration rejected successfully." });
  } catch (err) {
    console.error("❌ Reject retailer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------
// ✅ Get All Pending Retailer Registrations (Admin Only)
// -----------------------------
router.get("/pending-registrations", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied. Admins only." });
    }

    const [otpRecords] = await db.query(`
      SELECT e.id, e.name, e.email, e.contact_number, e.role,
             b.barangay_name AS barangay, b.municipality
      FROM email_otps e
      LEFT JOIN barangays b ON e.barangay_id = b.barangay_id
      WHERE LOWER(e.role) = 'retailer'
    `);

    for (let record of otpRecords) {
      const [images] = await db.query("SELECT * FROM otp_images WHERE otp_id = ?", [record.id]);
      record.images = images;
    }

    res.json({ success: true, data: otpRecords });
  } catch (err) {
    console.error("❌ Fetch pending retailers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
