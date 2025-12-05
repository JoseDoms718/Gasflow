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
        const [bundles] = await db.query(`
            SELECT 
                b.bundle_id,
                b.bundle_name,
                b.description,
                b.price,
                b.discounted_price,
                b.bundle_image,
                b.is_active,
                b.created_at,
                bi.quantity,
                p.product_id,
                p.product_name,
                p.product_description,
                p.image_url AS product_image,
                p.price AS product_price,
                p.discounted_price AS product_discounted_price,
                p.refill_price,
                p.product_type,
                p.discount_until,
                p.is_active AS product_is_active
            FROM bundles b
            LEFT JOIN bundle_items bi ON bi.bundle_id = b.bundle_id
            LEFT JOIN products p ON p.product_id = bi.product_id
            ORDER BY b.bundle_id DESC
        `);

        res.json({ success: true, bundles });
    } catch (err) {
        console.error("Error loading bundles:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// -----------------------------------------------------
// EDIT BUNDLE
// -----------------------------------------------------
router.put("/edit/:id", upload.single("bundle_image"), async (req, res) => {
    try {
        const bundleId = req.params.id;
        const { bundle_name, description, price, discounted_price, role, products } = req.body;

        // Parse products array
        const parsedProducts = JSON.parse(products); // [{product_id, quantity}, ...]

        // Update image if uploaded
        let imageFile;
        if (req.file) {
            imageFile = req.file.filename;

            // Delete old image
            const [oldBundleRows] = await db.query(`SELECT bundle_image FROM bundles WHERE bundle_id = ?`, [bundleId]);
            if (oldBundleRows.length && oldBundleRows[0].bundle_image) {
                const oldPath = path.join(uploadPath, oldBundleRows[0].bundle_image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        // Update bundle info
        await db.query(
            `UPDATE bundles SET bundle_name = ?, description = ?, price = ?, discounted_price = ?, role = ?, bundle_image = COALESCE(?, bundle_image) WHERE bundle_id = ?`,
            [bundle_name, description, price, discounted_price || null, role, imageFile || null, bundleId]
        );

        // Remove all existing bundle items
        await db.query(`DELETE FROM bundle_items WHERE bundle_id = ?`, [bundleId]);

        // Insert updated products
        if (parsedProducts.length > 0) {
            const values = parsedProducts.map(item => [bundleId, item.product_id, item.quantity]);
            await db.query(`INSERT INTO bundle_items (bundle_id, product_id, quantity) VALUES ?`, [values]);
        }

        res.json({ success: true, message: "Bundle updated successfully" });
    } catch (err) {
        console.error("Error editing bundle:", err);
        res.status(500).json({ success: false, error: "Failed to edit bundle" });
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
// GET SINGLE BUNDLE
// -----------------------------------------------------
router.get("/:id", async (req, res) => {
    try {
        const bundleId = req.params.id;

        // Get bundle info
        const [rows] = await db.query(
            `SELECT * FROM bundles WHERE bundle_id = ?`,
            [bundleId]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, error: "Bundle not found" });
        }

        // Get bundle items with product info
        const [items] = await db.query(
            `SELECT 
                bi.product_id,
                bi.quantity,
                p.product_name,
                p.image_url AS product_image,
                p.price AS product_price,
                p.discounted_price AS product_discounted_price,
                p.refill_price,
                p.product_type,
                p.discount_until,
                p.is_active AS product_is_active
            FROM bundle_items bi
            LEFT JOIN products p ON p.product_id = bi.product_id
            WHERE bi.bundle_id = ?`,
            [bundleId]
        );

        res.json({ success: true, bundle: rows[0], items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to load bundle" });
    }
});


module.exports = router;
