const express = require("express");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Upload path for banners
const uploadPath = path.join(__dirname, "../uploads/banners");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, `banner_${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only JPG, JPEG, PNG allowed"));
    cb(null, true);
  },
});

// 🟢 GET /banners - fetch all banners
router.get("/", async (req, res) => {
  try {
    const [banners] = await db.query(
      "SELECT id, banner_title, banner_description, image, status FROM banners ORDER BY id DESC"
    );
    res.json({ success: true, banners });
  } catch (err) {
    console.error("❌ Error loading banners:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🟢 GET /banners/:id - single banner
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, banner_title, banner_description, image, status FROM banners WHERE id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: "Banner not found" });
    res.json({ success: true, banner: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to load banner" });
  }
});

// 🟢 POST /banners - add banner
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { banner_title, banner_description } = req.body;
    const image = req.file ? req.file.filename : null;

    const [result] = await db.query(
      "INSERT INTO banners (banner_title, banner_description, image) VALUES (?, ?, ?)",
      [banner_title, banner_description, image]
    );

    res.status(201).json({
      success: true,
      banner: { id: result.insertId, banner_title, banner_description, image },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to add banner" });
  }
});

// 🟢 PUT /banners/:id - update banner
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { banner_title, banner_description } = req.body;
    const image = req.file ? req.file.filename : null;

    if (image) {
      const [oldRows] = await db.query("SELECT image FROM banners WHERE id = ?", [req.params.id]);
      if (oldRows[0]?.image) {
        const oldPath = path.join(uploadPath, oldRows[0].image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await db.query(
      "UPDATE banners SET banner_title = COALESCE(?, banner_title), banner_description = COALESCE(?, banner_description), image = COALESCE(?, image) WHERE id = ?",
      [banner_title, banner_description, image, req.params.id]
    );

    const [updated] = await db.query(
      "SELECT id, banner_title, banner_description, image, status FROM banners WHERE id = ?",
      [req.params.id]
    );

    res.json({ success: true, banner: updated[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update banner" });
  }
});

// 🟢 DELETE /banners/:id - delete banner
router.delete("/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT image FROM banners WHERE id = ?", [req.params.id]);
    if (rows[0]?.image) {
      const imgPath = path.join(uploadPath, rows[0].image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await db.query("DELETE FROM banners WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Banner deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to delete banner" });
  }
});

module.exports = router;
