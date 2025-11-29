require('dotenv').config();
const express = require("express");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ---------------------------
// Multer setup
// ---------------------------
const uploadPath = path.join(__dirname, "../uploads/branch_manager/branchPhotos");

// Ensure upload folder exists
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

// ---------------------------
// Create a new branch
// ---------------------------
router.post("/", upload.single("branch_picture"), async (req, res) => {
  const { user_id, branch_name, branch_contact, barangay_id } = req.body;
  let branch_picture = req.file ? req.file.filename : null;

  if (!user_id || !branch_name || !branch_contact) {
    return res.status(400).json({ error: "user_id, branch_name, and branch_contact are required." });
  }

  try {
    // 1️⃣ Check if user exists and is a branch_manager
    const [userRows] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'branch_manager'",
      [user_id]
    );

    if (userRows.length === 0) {
      return res.status(400).json({ error: "User does not exist or is not a branch_manager." });
    }

    // 2️⃣ Check if branch manager is already assigned to a branch
    const [existingBranch] = await db.query(
      "SELECT * FROM branches WHERE user_id = ?",
      [user_id]
    );

    if (existingBranch.length > 0) {
      return res.status(400).json({ error: "This branch_manager is already assigned to a branch." });
    }

    // 3️⃣ Validate barangay if provided
    if (barangay_id) {
      const [barangayRows] = await db.query(
        "SELECT * FROM barangays WHERE barangay_id = ?",
        [barangay_id]
      );
      if (barangayRows.length === 0) {
        return res.status(400).json({ error: "Invalid barangay selected." });
      }
    }

    // 4️⃣ Insert branch
    const [result] = await db.query(
      `INSERT INTO branches (user_id, branch_name, branch_contact, branch_picture, barangay_id)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, branch_name, branch_contact, branch_picture, barangay_id || null]
    );

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      branch_id: result.insertId,
      branch_picture,
    });
  } catch (error) {
    console.error("❌ Error creating branch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------------------------
// Get all branch managers available
// --------------------------------------
router.get("/available-managers", async (req, res) => {
  try {
    const [managers] = await db.query(
      `
      SELECT u.user_id, u.name, u.email, u.contact_number
      FROM users u
      WHERE u.role = 'branch_manager'
        AND u.user_id NOT IN (SELECT user_id FROM branches)
      ORDER BY u.user_id DESC
      `
    );

    res.json(managers);
  } catch (error) {
    console.error("❌ Error fetching available branch managers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
