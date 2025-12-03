require("dotenv").config();
const express = require("express");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authenticateToken = require("../middleware/authtoken");

const router = express.Router();

// Upload folder for bundles
const uploadPath = path.join(__dirname, "../uploads/products/bundle");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) =>
        cb(null, `bundle_${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/jpg"];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Only JPG, JPEG, PNG allowed"));
        }
        cb(null, true);
    }
});

// -----------------------------------------------------
// GET ALL BUNDLES
// -----------------------------------------------------
router.get("/", async (req, res) => {
    try {
        const [bundles] = await db.query(
            `SELECT * FROM bundles ORDER BY id DESC`
        );
        res.json({ success: true, bundles });
    } catch (err) {
        console.error("Error loading bundles:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// -----------------------------------------------------
// GET SINGLE BUNDLE
// -----------------------------------------------------
router.get("/:id", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM bundles WHERE id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, error: "Bundle not found" });
        }

        const [items] = await db.query(
            `SELECT product_id, quantity 
             FROM bundle_items 
             WHERE bundle_id = ?`,
            [req.params.id]
        );

        res.json({ success: true, bundle: rows[0], items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to load bundle" });
    }
});

// -----------------------------------------------------
// ADD BUNDLE
// -----------------------------------------------------
router.post("/add", upload.single("bundle_image"), async (req, res) => {
    try {
        const {
            bundle_name,
            description,
            price,
            discounted_price,
            role,
            products
        } = req.body;

        const parsedProducts = JSON.parse(products); // array of {product_id, quantity}
        const imageFile = req.file ? req.file.filename : null;

        const [bundleResult] = await db.query(
            `INSERT INTO bundles (bundle_name, description, bundle_image, role, price, discounted_price)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                bundle_name,
                description,
                imageFile,
                role,
                price,
                discounted_price || null
            ]
        );

        const bundleId = bundleResult.insertId;

        if (parsedProducts.length > 0) {
            const values = parsedProducts.map(item => [
                bundleId,
                item.product_id,
                item.quantity
            ]);

            await db.query(
                `INSERT INTO bundle_items (bundle_id, product_id, quantity)
                 VALUES ?`,
                [values]
            );
        }

        res.json({ success: true, message: "Bundle created", bundle_id: bundleId });

    } catch (err) {
        console.error("Error adding bundle:", err);
        res.status(500).json({ success: false, error: "Failed to create bundle" });
    }
});

// -----------------------------------------------------
// DELETE BUNDLE
// -----------------------------------------------------
router.delete("/:id", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT bundle_image FROM bundles WHERE id = ?", [
            req.params.id
        ]);

        if (rows[0]?.bundle_image) {
            const imgPath = path.join(uploadPath, rows[0].bundle_image);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }

        await db.query("DELETE FROM bundle_items WHERE bundle_id = ?", [req.params.id]);
        await db.query("DELETE FROM bundles WHERE id = ?", [req.params.id]);

        res.json({ success: true, message: "Bundle deleted successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to delete bundle" });
    }
});

module.exports = router;
