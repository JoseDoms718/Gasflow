const express = require("express");
const router = express.Router();
const pool = require("../config/db"); // promise pool
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const authenticateToken = require("../middleware/authtoken");

// Set upload folder
const uploadPath = path.join(__dirname, "../uploads/services_banners");

// Ensure folder exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Allowed enum values
const allowedTypes = ["users", "business_owner", "admin", "all"];

// Add a new service (admin only)
router.post("/", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    const { title, description, type } = req.body;
    const image_url = req.file ? `/uploads/services_banners/${req.file.filename}` : null;

    // Validate input
    if (!title || !description || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid type. Allowed: ${allowedTypes.join(", ")}` });
    }

    const [result] = await pool.query(
      "INSERT INTO services (title, description, image_url, type) VALUES (?, ?, ?, ?)",
      [title, description, image_url, type]
    );

    // Only return success if insert worked
    res.status(201).json({ message: "Service added successfully", serviceId: result.insertId });
  } catch (err) {
    console.error("POST /services ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});
router.put("/:id", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    const serviceId = req.params.id;
    const { title, description, type } = req.body;

    // Validate type if provided
    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid type. Allowed: ${allowedTypes.join(", ")}` });
    }

    // Check if service exists
    const [existing] = await pool.query("SELECT * FROM services WHERE id = ?", [serviceId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    // If a new image is uploaded, use it; otherwise keep the existing image
    const image_url = req.file ? `/uploads/services_banners/${req.file.filename}` : existing[0].image_url;

    // Update only provided fields
    await pool.query(
      `UPDATE services
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           image_url = ?,
           type = COALESCE(?, type),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, image_url, type, serviceId]
    );

    res.json({ message: "Service updated successfully" });
  } catch (err) {
    console.error("PUT /services/:id ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
