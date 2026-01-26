require('dotenv').config();
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

// Add new service
router.post("/", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    // Only admins can add services
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    const { title, description, type } = req.body;
    const image_url = req.file ? `/uploads/services_banners/${req.file.filename}` : null;

    // Validate input
    if (!title || !description || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const allowedTypes = ["users", "business_owner", "admin", "all"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid type. Allowed: ${allowedTypes.join(", ")}` });
    }

    // ✅ Use user ID from token
    const user_id = req.user.id;

    const [result] = await pool.query(
      "INSERT INTO services (user_id, title, description, image_url, type) VALUES (?, ?, ?, ?, ?)",
      [user_id, title, description, image_url, type]
    );

    res.status(201).json({ message: "Service added successfully", serviceId: result.insertId });
  } catch (err) {
    console.error("POST /services ERROR:", err);
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

router.get("/fetchServices", authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const userRole = req.user.role; // 'admin', 'business_owner', 'users', etc.

    const allowedTypes = ["users", "business_owner", "admin", "all"];

    // Base query: include user_id
    let query = `
      SELECT s.*, s.user_id, u.name AS user_name, u.role AS user_role
      FROM services s
      LEFT JOIN users u ON s.user_id = u.user_id
    `;
    const params = [];

    // Non-admins: only see services for 'all' + their role
    if (userRole !== "admin") {
      query += " WHERE s.type = 'all' OR s.type = ?";
      params.push(userRole);

      if (type) {
        if (!allowedTypes.includes(type)) {
          return res.status(400).json({ message: `Invalid type. Allowed: ${allowedTypes.join(", ")}` });
        }
        query += " AND s.type = ?";
        params.push(type);
      }
    } else if (type) {
      // Admins can filter by type
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({ message: `Invalid type. Allowed: ${allowedTypes.join(", ")}` });
      }
      query += " WHERE s.type = ?";
      params.push(type);
    }

    query += " ORDER BY s.created_at DESC";

    const [services] = await pool.query(query, params);

    res.json({ services });
  } catch (err) {
    console.error("GET /services ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// 👀 PUBLIC SERVICES (NO AUTH)
router.get("/public", async (req, res) => {
  try {
    const query = `
      SELECT s.*, s.user_id, u.name AS user_name
      FROM services s
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE s.type = 'all'
      ORDER BY s.created_at DESC
    `;

    const [services] = await pool.query(query);
    res.json({ services });
  } catch (err) {
    console.error("GET /services/public ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});




module.exports = router;
