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
// GET BUNDLES ADDED BY BRANCH MANAGER (ADMIN VIEW)
// -----------------------------------------------------
router.get("/admin/get-bundles", authenticateToken, async (req, res) => {
    try {
        // ✅ Only allow admin
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied. Admins only.",
            });
        }

        const sql = `
            SELECT 
                bb.id AS branch_bundle_id,
                bb.branch_id,
                b.branch_name,

                bl.bundle_id,
                bl.bundle_name,
                bl.description,
                bl.bundle_image,
                bl.price AS default_price,
                bl.discounted_price AS default_discounted_price,
                bl.is_active,

                bbp.id AS branch_bundle_price_id,
                bbp.price AS branch_price,
                bbp.discounted_price AS branch_discounted_price,

                bi.product_id,
                p.product_name,
                p.image_url AS product_image,
                p.price AS product_price,
                p.discounted_price AS product_discounted_price,
                bi.quantity

            FROM branch_bundles bb
            JOIN branches b ON b.branch_id = bb.branch_id
            JOIN bundles bl ON bl.bundle_id = bb.bundle_id
            LEFT JOIN branch_bundle_prices bbp 
                ON bbp.branch_id = bb.branch_id 
                AND bbp.bundle_id = bb.bundle_id
            LEFT JOIN bundle_items bi
                ON bi.bundle_id = bl.bundle_id
            LEFT JOIN products p
                ON p.product_id = bi.product_id

            ORDER BY bb.branch_id, bl.bundle_name, bi.id
        `;

        const [rows] = await db.query(sql);

        // Group by bundle
        const bundlesMap = {};

        rows.forEach(item => {
            const bundleId = item.branch_bundle_id;

            if (!bundlesMap[bundleId]) {
                bundlesMap[bundleId] = {
                    branch_bundle_id: item.branch_bundle_id,
                    branch_id: item.branch_id,
                    branch_name: item.branch_name,

                    bundle_id: item.bundle_id,
                    bundle_name: item.bundle_name,
                    description: item.description,
                    bundle_image: item.bundle_image,
                    is_active: item.is_active,

                    branch_bundle_price_id: item.branch_bundle_price_id ?? null,
                    price:
                        item.branch_price !== null
                            ? item.branch_price
                            : item.default_price,
                    discounted_price:
                        item.branch_discounted_price !== null
                            ? item.branch_discounted_price
                            : item.default_discounted_price,

                    products: []
                };
            }

            // Add products if exists
            if (item.product_id) {
                bundlesMap[bundleId].products.push({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    product_image: item.product_image,
                    price: item.product_price,
                    discounted_price: item.product_discounted_price,
                    quantity: item.quantity
                });
            }
        });

        res.json({ bundles: Object.values(bundlesMap) });

    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({
            message: "Server error",
            error
        });
    }
});

// -----------------------------------------------------
// GET BUNDLES FOR BUYERS
// -----------------------------------------------------
router.get("/buyer/bundles", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const buyerRole = user.role; // "users" | "retailer" | "business_owner"
    const branchId = user.branches && user.branches.length > 0 ? user.branches[0] : null;

    if (!buyerRole) {
      return res.status(400).json({ success: false, error: "User role missing." });
    }

    // Retailers & business owners MUST have a branch
    if ((buyerRole === "retailer" || buyerRole === "business_owner") && !branchId) {
      return res.status(400).json({ success: false, error: "Branch required for this role." });
    }

    const branchFilter = branchId ? "bb.branch_id = ?" : "1=1";
    const params = branchId ? [branchId, buyerRole] : [buyerRole];

    const sql = `
      SELECT 
        bb.id AS branch_bundle_id,
        bb.branch_id,
        br.branch_name,
        br.barangay_id,
        b.barangay_name,
        b.municipality,

        bl.bundle_id,
        bl.bundle_name,
        bl.description,
        bl.bundle_image,
        bl.role AS allowed_role,
        bl.price AS default_price,
        bl.discounted_price AS default_discounted_price,
        bl.is_active,

        bbp.id AS branch_bundle_price_id,
        bbp.price AS branch_price,
        bbp.discounted_price AS branch_discounted_price,

        bi.product_id,
        p.product_name,
        p.image_url AS product_image,
        p.price AS product_price,
        p.discounted_price AS product_discounted_price,
        bi.quantity

      FROM branch_bundles bb
      JOIN bundles bl ON bl.bundle_id = bb.bundle_id
      LEFT JOIN branch_bundle_prices bbp 
        ON bbp.branch_id = bb.branch_id 
        AND bbp.bundle_id = bb.bundle_id
      LEFT JOIN bundle_items bi 
        ON bi.bundle_id = bl.bundle_id
      LEFT JOIN products p 
        ON p.product_id = bi.product_id
      LEFT JOIN branches br
        ON br.branch_id = bb.branch_id
      LEFT JOIN barangays b
        ON b.barangay_id = br.barangay_id

      WHERE ${branchFilter}
        AND bl.is_active = 1
        AND (bl.role = 'all' OR bl.role = ?)

      ORDER BY bl.bundle_name, bi.id
    `;

    const [rows] = await db.query(sql, params);

    const bundlesMap = {};

    rows.forEach(item => {
      const bundleId = item.branch_bundle_id;

      if (!bundlesMap[bundleId]) {
        bundlesMap[bundleId] = {
          branch_bundle_id: item.branch_bundle_id,
          branch_id: item.branch_id,
          branch_name: item.branch_name,
          barangay_id: item.barangay_id,
          barangay_name: item.barangay_name,
          municipality: item.municipality,

          bundle_id: item.bundle_id,
          bundle_name: item.bundle_name,
          description: item.description,
          bundle_image: item.bundle_image,
          role: item.allowed_role,
          is_active: item.is_active,

          branch_bundle_price_id: item.branch_bundle_price_id ?? null,
          price: item.branch_price !== null ? item.branch_price : item.default_price,
          discounted_price: item.branch_discounted_price !== null ? item.branch_discounted_price : item.default_discounted_price,

          products: []
        };
      }

      if (item.product_id) {
        bundlesMap[bundleId].products.push({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          price: item.product_price,
          discounted_price: item.product_discounted_price,
          quantity: item.quantity
        });
      }
    });

    res.json({ bundles: Object.values(bundlesMap) });

  } catch (error) {
    console.error("ERROR /buyer/bundles:", error);
    res.status(500).json({
      success: false,
      error: "Server error.",
    });
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
// EDIT BRANCH BUNDLE
// -----------------------------------------------------
router.put("/branch/edit/bundle/:id", authenticateToken, async (req, res) => {
  try {
    const branchBundlePriceId = req.params.id;
    let { branch_price, branch_discounted_price } = req.body;

    // Validate input
    branch_price = Number(branch_price);
    branch_discounted_price = branch_discounted_price ? Number(branch_discounted_price) : null;

    if (isNaN(branch_price) || branch_price <= 0) {
      return res.status(400).json({ success: false, error: "Invalid branch_price" });
    }

    if (branch_discounted_price !== null && branch_discounted_price > branch_price) {
      branch_discounted_price = branch_price; // clamp discounted price to branch_price
    }

    // Update branch_bundle_prices
    await db.query(
      `UPDATE branch_bundle_prices 
       SET price = ?, discounted_price = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [branch_price, branch_discounted_price, branchBundlePriceId]
    );

    // Return updated record
    const [updatedRows] = await db.query(
      `SELECT * FROM branch_bundle_prices WHERE id = ?`,
      [branchBundlePriceId]
    );

    if (!updatedRows.length) {
      return res.status(404).json({ success: false, error: "Branch bundle price not found" });
    }

    res.json({
      success: true,
      data: updatedRows[0],
      message: "Branch bundle price updated successfully",
    });
  } catch (err) {
    console.error("Error updating branch bundle price:", err);
    res.status(500).json({ success: false, error: "Failed to update branch bundle price" });
  }
});


router.put("/branch/bundle/sync/:id", authenticateToken, async (req, res) => {
  try {
    const branchBundlePriceId = req.params.id;

    // Only admin can sync
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized: Admins only." });
    }

    // Get the branch_bundle_prices row
    const [branchRows] = await db.execute(
      `SELECT id AS branch_bundle_price_id, branch_id, bundle_id
       FROM branch_bundle_prices
       WHERE id = ?`,
      [branchBundlePriceId]
    );

    if (!branchRows.length) {
      return res.status(404).json({ error: "Branch bundle price not found." });
    }

    const { branch_id, bundle_id } = branchRows[0];

    // Get main bundle info
    const [bundleRows] = await db.execute(
      `SELECT * FROM bundles WHERE bundle_id = ?`,
      [bundle_id]
    );

    if (!bundleRows.length) {
      return res.status(404).json({ error: "Main bundle not found." });
    }

    const bundle = bundleRows[0];

    // Update branch_bundle_prices
    await db.execute(
      `UPDATE branch_bundle_prices
       SET price = ?, discounted_price = ?, updated_at = NOW()
       WHERE id = ?`,
      [bundle.price, bundle.discounted_price, branchBundlePriceId]
    );

    // Get branch info
    const [branchInfo] = await db.execute(
      `SELECT b.branch_name, b.branch_contact, br.municipality, br.barangay_name
       FROM branches b
       LEFT JOIN barangays br ON b.barangay_id = br.barangay_id
       WHERE b.branch_id = ?`,
      [branch_id]
    );

    // Get bundle items with product info
    const [items] = await db.execute(
      `SELECT 
         bi.product_id,
         bi.quantity,
         p.product_name,
         p.image_url AS product_image,
         p.price AS product_price,
         p.discounted_price AS product_discounted_price
       FROM bundle_items bi
       LEFT JOIN products p ON p.product_id = bi.product_id
       WHERE bi.bundle_id = ?`,
      [bundle_id]
    );

    // Return combined response
    res.json({
      branch_bundle_price_id: branchBundlePriceId,
      branch_id,
      bundle_id,
      branch_price: bundle.price,
      branch_discounted_price: bundle.discounted_price,
      branch_price_updated_at: new Date(),
      ...branchInfo[0],
      ...bundle,
      items
    });
  } catch (err) {
    console.error("❌ Error syncing branch bundle price:", err);
    res.status(500).json({ error: "Failed to sync branch bundle price" });
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

    // Get main bundle info
    const [bundleRows] = await db.execute(
      `SELECT * FROM bundles WHERE bundle_id = ?`,
      [bundleId]
    );

    if (!bundleRows.length) {
      return res.status(404).json({ success: false, error: "Bundle not found" });
    }

    const bundle = bundleRows[0];

    // Get all branch prices for this bundle with branch_bundle_id
    const [branchPrices] = await db.execute(
      `SELECT 
         bb.id AS branch_bundle_id,
         bb.branch_id,
         bb.bundle_id,
         bbp.price AS branch_price,
         bbp.discounted_price AS branch_discounted_price,
         bbp.updated_at
       FROM branch_bundles bb
       LEFT JOIN branch_bundle_prices bbp
         ON bb.id = bbp.bundle_id AND bb.branch_id = bbp.branch_id
       WHERE bb.bundle_id = ?`,
      [bundleId]
    );

    // Get bundle items with product info
    const [items] = await db.execute(
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

    res.json({
      success: true,
      bundle,
      branch_prices: branchPrices,
      items
    });
  } catch (err) {
    console.error("❌ Error loading bundle:", err);
    res.status(500).json({ success: false, error: "Failed to load bundle" });
  }
});


module.exports = router;