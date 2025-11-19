require('dotenv').config();
const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Set upload path for branch manager branch photos
const uploadPath = path.join(__dirname, "../uploads/branch_manager/branchPhotos");

// Ensure upload directory exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `branch_${req.user.id}_${Date.now()}${ext}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      req.fileValidationError = "Only JPG, JPEG, and PNG files are allowed.";
      return cb(null, false);
    }
    cb(null, true);
  },
});

/**
 * @route GET /branchinfo
 * @desc Get branch info for logged-in branch manager
 * @access Private (Branch Manager)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "branch_manager") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Only branch managers can view this resource.",
      });
    }

    const userId = req.user.id;

    const [branchData] = await db.query(
      `
      SELECT 
        br.branch_id,
        br.branch_name,
        br.branch_contact,
        br.branch_picture,
        br.barangay_id,
        b.barangay_name AS barangay,
        b.municipality,
        br.created_at,
        br.updated_at
      FROM branches br
      LEFT JOIN barangays b ON br.barangay_id = b.barangay_id
      WHERE br.user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (branchData.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No branch information found for this branch manager.",
      });
    }

    res.json({
      success: true,
      branch: branchData[0],
    });
  } catch (err) {
    console.error("❌ Error fetching branch info:", err);
    res.status(500).json({
      success: false,
      error: "Server error while fetching branch information.",
    });
  }
});

/**
 * @route PUT /branchinfo
 * @desc Update branch info (with multer for branch_picture)
 * @access Private (Branch Manager)
 */
router.put(
  "/",
  authenticateToken,
  (req, res, next) => {
    upload.single("branch_picture")(req, res, function (err) {
      if (req.fileValidationError) {
        return res.status(400).json({
          success: false,
          error: req.fileValidationError,
        });
      }

      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error: "Upload error. Try again.",
        });
      }

      if (err) {
        return res.status(500).json({
          success: false,
          error: "Unexpected error occurred.",
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (req.user.role !== "branch_manager") {
        return res.status(403).json({
          success: false,
          error: "Access denied. Only branch managers can update this resource.",
        });
      }

      const userId = req.user.id;
      const { branch_name = null, branch_contact = null, barangay_id = null } = req.body;
      const branch_picture = req.file ? req.file.filename : null;

      const [branchCheck] = await db.query(
        "SELECT branch_id, branch_picture AS oldPicture FROM branches WHERE user_id = ? LIMIT 1",
        [userId]
      );

      if (branchCheck.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Branch not found for this user.",
        });
      }

      const branchId = branchCheck[0].branch_id;

      // Delete old picture if replaced
      if (branch_picture && branchCheck[0].oldPicture) {
        const oldPath = path.join(uploadPath, branchCheck[0].oldPicture);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      // Update branch info
      await db.query(
        `
        UPDATE branches
        SET 
          branch_name = COALESCE(?, branch_name),
          branch_contact = COALESCE(?, branch_contact),
          branch_picture = COALESCE(?, branch_picture),
          barangay_id = COALESCE(?, barangay_id),
          updated_at = NOW()
        WHERE branch_id = ?
        `,
        [branch_name, branch_contact, branch_picture, barangay_id, branchId]
      );

      // Return full updated branch object
      const [updatedBranchArr] = await db.query(
        `
        SELECT 
          br.branch_id,
          br.branch_name,
          br.branch_contact,
          br.branch_picture,
          br.barangay_id,
          b.barangay_name AS barangay,
          b.municipality,
          br.created_at,
          br.updated_at
        FROM branches br
        LEFT JOIN barangays b ON br.barangay_id = b.barangay_id
        WHERE br.branch_id = ?
        LIMIT 1
        `,
        [branchId]
      );

      res.json({
        success: true,
        message: "Branch information updated successfully.",
        branch: updatedBranchArr[0],
      });
    } catch (err) {
      console.error("❌ Error updating branch info:", err);
      res.status(500).json({
        success: false,
        error: "Server error while updating branch information.",
      });
    }
  }
);

/**
 * @route GET /branchinfo/all
 * @desc Get all branches (branch managers)
 * @access Public
 */
router.get("/all", async (req, res) => {
  try {
    const [branches] = await db.query(`
      SELECT 
        br.branch_id,
        br.user_id,          -- branch manager ID
        br.branch_name,
        br.branch_contact,
        br.branch_picture,
        b.barangay_name AS barangay,
        b.municipality
      FROM branches br
      LEFT JOIN barangays b ON br.barangay_id = b.barangay_id
    `);

    res.json({ success: true, branches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch branches" });
  }
});

module.exports = router;
