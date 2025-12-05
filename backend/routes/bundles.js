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
// GET BUNDLES ADDED TO LOGGED-IN BRANCH (Branch Manager)
// -----------------------------------------------------
router.get("/branch/my-bundles", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user.branches || user.branches.length === 0) {
      return res.status(400).json({ success: false, error: "No branch assigned to this user." });
    }

    const branch_id = user.branches[0];

    const [rows] = await db.query(`
      SELECT 
        bb.id AS branch_bundle_id,
        b.bundle_id,
        b.bundle_name,
        b.description,
        b.bundle_image,
        bbp.price AS branch_price,
        bbp.discounted_price AS branch_discounted_price,
        b.is_active AS bundle_is_active,
        bi.id AS bundle_item_id,
        bi.product_id,
        bi.quantity AS required_qty,
        p.product_name,
        p.image_url AS product_image,
        p.price AS product_price,
        p.discounted_price AS product_discounted_price,
        p.refill_price,
        p.product_type,
        p.discount_until,
        p.is_active AS product_is_active
      FROM branch_bundles bb
      INNER JOIN bundles b ON bb.bundle_id = b.bundle_id
      LEFT JOIN branch_bundle_prices bbp ON bbp.branch_id = bb.branch_id AND bbp.bundle_id = bb.bundle_id
      LEFT JOIN bundle_items bi ON bi.bundle_id = b.bundle_id
      LEFT JOIN products p ON bi.product_id = p.product_id
      WHERE bb.branch_id = ?
      ORDER BY bb.id DESC
    `, [branch_id]);

    // Group items per bundle
    const bundleMap = {};
    rows.forEach(row => {
      const key = row.bundle_id;
      if (!bundleMap[key]) {
        bundleMap[key] = {
          branch_bundle_id: row.branch_bundle_id,
          branch_id,
          bundle_id: row.bundle_id,
          bundle_name: row.bundle_name,
          description: row.description,
          bundle_image: row.bundle_image,
          branch_price: row.branch_price,
          branch_discounted_price: row.branch_discounted_price,
          bundle_is_active: row.bundle_is_active,
          items: []
        };
      }

      if (row.product_id) {
        bundleMap[key].items.push({
          bundle_item_id: row.bundle_item_id,
          product_id: row.product_id,
          required_qty: row.required_qty,
          product_name: row.product_name,
          product_image: row.product_image,
          product_price: row.product_price,
          product_discounted_price: row.product_discounted_price,
          refill_price: row.refill_price,
          product_type: row.product_type,
          discount_until: row.discount_until,
          product_is_active: row.product_is_active
        });
      }
    });

    res.json({ success: true, branchBundles: Object.values(bundleMap) });

  } catch (err) {
    console.error("Error fetching branch bundles:", err);
    res.status(500).json({ success: false, error: "Failed to load branch bundles" });
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

// ---------------------
// Add Bundle to Branch
// ---------------------
router.post("/branch/add-bundle", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // ✅ Ensure user has at least one branch
    if (!user.branches || user.branches.length === 0) {
      return res.status(400).json({ success: false, error: "No branch assigned to this user." });
    }

    const branch_id = user.branches[0]; // Use first branch

    const { bundle_id } = req.body;
    if (!bundle_id) {
      return res.status(400).json({ success: false, error: "bundle_id is required." });
    }

    // 1️⃣ Check if the bundle exists
    const [bundleRows] = await db.query(
      "SELECT price, discounted_price FROM bundles WHERE bundle_id = ?",
      [bundle_id]
    );

    if (bundleRows.length === 0) {
      return res.status(404).json({ success: false, error: "Bundle not found." });
    }

    const bundle = bundleRows[0];

    // 2️⃣ Insert into branch_bundles
    const [branchBundleResult] = await db.query(
      "INSERT INTO branch_bundles (branch_id, bundle_id, added_at) VALUES (?, ?, NOW())",
      [branch_id, bundle_id]
    );

    // 3️⃣ Insert into branch_bundle_prices
    await db.query(
      "INSERT INTO branch_bundle_prices (branch_id, bundle_id, price, discounted_price, updated_at) VALUES (?, ?, ?, ?, NOW())",
      [branch_id, bundle_id, bundle.price, bundle.discounted_price]
    );

    res.json({
      success: true,
      message: "Bundle added to branch successfully.",
      branch_bundle_id: branchBundleResult.insertId
    });
  } catch (err) {
    console.error("❌ Error adding bundle to branch:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// -----------------------------------------------------
// GET BUNDLES THAT CAN BE ADDED TO LOGGED-IN BRANCH
// -----------------------------------------------------
router.get("/branch/check-available", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // ✅ Ensure the user has at least one branch
    if (!user.branches || user.branches.length === 0) {
      return res.json({ success: false, error: "User has no branch assigned" });
    }

    // For now, we take the first branch (if multiple branches exist)
    const branch_id = user.branches[0];

    // 1. Get bundles WITH product info
    const [bundleRows] = await db.query(`
      SELECT 
          b.bundle_id,
          b.bundle_name,
          b.description,
          b.bundle_image,
          b.price,
          b.discounted_price,
          b.is_active,
          bi.product_id,
          bi.quantity AS required_qty,
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
      LEFT JOIN products p ON bi.product_id = p.product_id
      WHERE b.is_active = 1
      ORDER BY b.bundle_id DESC
    `);

    // 2. Get inventory for the logged-in branch
    const [inventoryRows] = await db.query(`
      SELECT product_id, stock
      FROM inventory
      WHERE branch_id = ?
    `, [branch_id]);

    // Convert inventory into lookup object
    const inventoryMap = {};
    inventoryRows.forEach(row => {
      inventoryMap[row.product_id] = row.stock;
    });

    // 3. Group bundle items with product info
    const bundleMap = {};
    bundleRows.forEach(row => {
      if (!bundleMap[row.bundle_id]) {
        bundleMap[row.bundle_id] = {
          bundle_id: row.bundle_id,
          bundle_name: row.bundle_name,
          description: row.description,
          bundle_image: row.bundle_image,
          price: row.price,
          discounted_price: row.discounted_price,
          is_active: row.is_active,
          items: []
        };
      }

      if (row.product_id) {
        bundleMap[row.bundle_id].items.push({
          product_id: row.product_id,
          required_qty: row.required_qty,
          product_name: row.product_name,
          product_description: row.product_description,
          product_image: row.product_image,
          product_price: row.product_price,
          product_discounted_price: row.product_discounted_price,
          refill_price: row.refill_price,
          product_type: row.product_type,
          discount_until: row.discount_until,
          product_is_active: row.product_is_active
        });
      }
    });

    // 4. Check if branch has ALL required products + enough quantity
    const availableBundles = Object.values(bundleMap).filter(bundle => {
      return bundle.items.every(item => {
        const branchStock = inventoryMap[item.product_id] || 0;
        return branchStock >= item.required_qty;
      });
    });

    res.json({ success: true, availableBundles });

  } catch (err) {
    console.error("Error checking available bundles:", err);
    res.status(500).json({ success: false, error: "Failed to check available bundles" });
  }
});

// -----------------------------------------------------
// BRANCH ADD BUNDLE
// -----------------------------------------------------
router.post("/branch/add-bundles", authenticateToken, async (req, res) => {
    try {
        const branch_id = req.user.branch_id; // assume branch_id stored in token
        const { bundle_id } = req.body;

        if (!bundle_id) {
            return res.status(400).json({ success: false, error: "bundle_id is required" });
        }

        // Check if bundle exists
        const [bundleRows] = await db.query(
            `SELECT price, discounted_price FROM bundles WHERE bundle_id = ?`,
            [bundle_id]
        );

        if (!bundleRows.length) {
            return res.status(404).json({ success: false, error: "Bundle not found" });
        }

        const { price, discounted_price } = bundleRows[0];

        // Insert into branch_bundles
        const [branchBundleResult] = await db.query(
            `INSERT INTO branch_bundles (branch_id, bundle_id, added_at) VALUES (?, ?, NOW())`,
            [branch_id, bundle_id]
        );

        const branch_bundle_id = branchBundleResult.insertId;

        // Insert into branch_bundle_prices (copy from bundles)
        await db.query(
            `INSERT INTO branch_bundle_prices (branch_id, bundle_id, price, discounted_price, updated_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [branch_id, bundle_id, price, discounted_price || null]
        );

        res.json({
            success: true,
            message: "Bundle added to branch successfully",
            branch_bundle_id
        });

    } catch (err) {
        console.error("Error adding bundle for branch:", err);
        res.status(500).json({ success: false, error: "Failed to add bundle for branch" });
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
