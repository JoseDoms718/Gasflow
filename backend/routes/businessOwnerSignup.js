require('dotenv').config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sendEmail = require("../utils/sendEmail")
const authenticateToken = require("../middleware/authtoken");

// Build the upload path
const uploadPath = path.join(__dirname, "../uploads/business_owner/establishmentPhotos");

// Setup multer for image upload
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

/* -----------------------------------------
   ✅ Pre-registration Route
----------------------------------------- */
router.post("/", upload.array("picture"), async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      contact_number, 
      barangay_id,   // keep this
      home_address
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !barangay_id || !home_address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if email already exists
    const [existing] = await db.query(
      "SELECT * FROM pending_accounts WHERE email = ?", 
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: "This email is already registered or pending verification.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into pending_accounts (no municipality column)
    const [result] = await db.query(
      `INSERT INTO pending_accounts 
        (email, name, barangay_id, home_address, contact_number, password, role, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        email,
        name,
        barangay_id,
        home_address,
        contact_number,
        hashedPassword,
        "business_owner",
      ]
    );

    const pendingId = result.insertId;

    // Save uploaded pictures
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const relativePath = path
          .relative(path.join(__dirname, "../"), file.path)
          .replace(/\\/g, "/");

        await db.query(
          `INSERT INTO otp_images (otp_id, type, image_url) 
           VALUES (?, ?, ?)`,
          [pendingId, "establishmentPhoto", relativePath]
        );
      }
    }

    res.json({
      success: true,
      message: "🎉 Registration info submitted. Please wait for admin confirmation.",
    });

  } catch (err) {
    console.error("❌ Business owner pre-registration error:", err);

    if (err.code === "ER_DUP_ENTRY" && err.sqlMessage.includes("email")) {
      return res.status(400).json({
        error: "This email is already registered or pending verification.",
      });
    }

    res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------------------
   ✅ Approve Business Owner Route
----------------------------------------- */
router.post("/approve/:pendingId", authenticateToken, async (req, res) => {
  try {
    // Only Admin can approve
    if (req.user.role.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admins only." });
    }

    const { pendingId } = req.params;

    // Get pending account
    const [records] = await db.query(
      "SELECT * FROM pending_accounts WHERE id = ?",
      [pendingId]
    );

    if (records.length === 0) {
      return res.status(404).json({ error: "Pending registration not found." });
    }

    const data = records[0];

    // Insert into users table (NOW with home_address)
    await db.query(
      `INSERT INTO users 
        (name, email, contact_number, barangay_id, home_address, password, role, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.email,
        data.contact_number,
        data.barangay_id,
        data.home_address, // ✅ ADDED
        data.password,
        data.role,
        "active",
      ]
    );

    // Delete pending account (images remain in otp_images)
    await db.query("DELETE FROM pending_accounts WHERE id = ?", [pendingId]);

    // Send approval email
    try {
      await sendEmail(
        data.email,
        "✅ Gasflow Business Owner Registration Approved",
        {
          html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            
            <!-- Header -->
            <div style="background-color: #0047ab; padding: 20px; text-align: center;">
              <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
              <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
            </div>

            <!-- Body -->
            <div style="padding: 30px;">
              <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Dear ${data.name},</h2>
              <p style="margin-bottom: 15px;">
                We are pleased to inform you that your Business Owner registration with Gasflow has been <strong>approved</strong>.
              </p>
              <p style="margin-bottom: 15px;">
                You can now log in to your account and access all the features available to business owners.
              </p>
              <p style="margin-bottom: 15px;">
                <a href="${process.env.FRONTEND_URL}/login" 
                   style="display: inline-block; padding: 10px 20px; background-color: #0047ab; color: #fff; text-decoration: none; border-radius: 5px;">
                  Log In Now
                </a>
              </p>
              <p style="margin-bottom: 0;">Thank you for choosing Gasflow.</p>
              <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
              &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
            </div>

          </div>
          `,
        }
      );
    } catch (emailErr) {
      console.error("❌ Failed to send approval email:", emailErr.message);
    }

    res.json({
      success: true,
      message: "✅ Business owner approved successfully.",
    });

  } catch (err) {
    console.error("❌ Approve business owner error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* -----------------------------------------
   ❌ Reject Business Owner Route with Email
----------------------------------------- */
router.post("/reject/:pendingId", authenticateToken, async (req, res) => {
  try {
    // Only admins can reject
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admins only." });
    }

    const { pendingId } = req.params;

    // Fetch pending account
    const [records] = await db.query(
      "SELECT * FROM pending_accounts WHERE id = ?",
      [pendingId]
    );

    if (records.length === 0) {
      return res.status(404).json({ error: "Pending registration not found." });
    }

    const data = records[0];

    // Fetch and delete all uploaded images
    const [images] = await db.query(
      "SELECT * FROM otp_images WHERE otp_id = ?",
      [pendingId]
    );

    for (let img of images) {
      const filePath = path.join(__dirname, "../", img.image_url);

      // Delete image safely (won't crash if not found)
      try {
        fs.rmSync(filePath, { force: true });
      } catch (e) {
        console.warn("⚠️ Failed to remove image:", filePath);
      }
    }

    // Delete DB records
    await db.query("DELETE FROM otp_images WHERE otp_id = ?", [pendingId]);
    await db.query("DELETE FROM pending_accounts WHERE id = ?", [pendingId]);

    // Send rejection email
    try {
      await sendEmail(
        data.email,
        "❌ Gasflow Business Owner Registration Rejected",
        {
          html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
            
            <!-- Header -->
            <div style="background-color: #0047ab; padding: 25px; text-align: center;">
              <img src="cid:logoWhite" width="100" alt="Gasflow Logo" style="margin-bottom: 10px;" />
              <h1 style="color: #fff; font-size: 24px; margin: 0;">Gasflow</h1>
            </div>

            <!-- Body -->
            <div style="padding: 30px; background-color: #f9f9f9; color: #333;">
              <h2 style="color: #0047ab; font-size: 22px; margin-bottom: 20px;">Hello, ${data.name}</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                We regret to inform you that your <strong>Business Owner registration</strong> with Gasflow has been <span style="color: #d32f2f; font-weight: bold;">rejected</span>.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                If you have any questions or would like to reapply, please contact our support team.
              </p>

              <div style="text-align: center; margin-bottom: 20px;">
                <a href="mailto:support@gasflow.com" style="background-color: #0047ab; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-size: 16px; display: inline-block;">
                  Contact Support
                </a>
              </div>

              <p style="font-size: 14px; color: #555; text-align: center; margin-top: 20px;">
                Thank you for your interest in Gasflow. We hope to see you join us in the future.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #777;">
              &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
            </div>
          </div>
          `,
        }
      );
    } catch (emailErr) {
      console.error("❌ Failed to send rejection email:", emailErr.message);
    }

    // Response
    res.json({
      success: true,
      message: "❌ Business owner registration rejected successfully.",
    });

  } catch (err) {
    console.error("❌ Reject business owner error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
/* -----------------------------------------
   ✅ Get All Pending Registrations (Admin Only)
----------------------------------------- */
router.get("/pending-registrations", authenticateToken, async (req, res) => {
  try {
    // Admin access only
    if (!req.user || req.user.role.toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied. Admins only." });
    }

    const { role } = req.query; // optional filter
    let query = `
      SELECT 
        e.id,
        e.name,
        e.email,
        e.contact_number,
        e.role,
        e.home_address,         -- ✅ GET HOME ADDRESS
        b.barangay_name AS barangay,
        b.municipality,
        e.created_at,
        e.updated_at
      FROM pending_accounts e
      LEFT JOIN barangays b ON e.barangay_id = b.barangay_id
    `;

    const params = [];

    if (role) {
      query += " WHERE LOWER(e.role) = ?";
      params.push(role.toLowerCase());
    }

    const [records] = await db.query(query, params);

    // Fetch images for each pending account
    for (let record of records) {
      const [images] = await db.query(
        "SELECT * FROM otp_images WHERE otp_id = ?",
        [record.id]
      );
      record.images = images;
    }

    res.json({ success: true, data: records });

  } catch (err) {
    console.error("❌ Fetch pending registrations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
