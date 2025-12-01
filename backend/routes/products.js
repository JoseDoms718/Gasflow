require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");

router.get("/test", (req, res) => res.json({ ok: true }));

// ==============================
// Setup for Multer Uploads
// ==============================
const uploadPath = path.join(__dirname, "../uploads/products");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// ==============================
// Helpers
// ==============================
function formatProductImage(p) {
  return {
    ...p,
    image_url: p.image_url
      ? `${process.env.BASE_URL}/products/images/${p.image_url}`
      : null,
  };
}

function deleteImageIfExists(filePath) {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function validateProductFields(product_type, discounted_price) {
  if (!product_type || !["regular", "discounted"].includes(product_type))
    return "Invalid or missing product_type.";
  if (product_type === "discounted" && !discounted_price)
    return "Discounted products must have a discounted_price.";
  return null;
}

function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d)) return null;
  return d.toISOString().split("T")[0];
}
function authorizeAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
}

// ==============================
// Get Branch Manager’s Products
// ==============================
router.get("/my-products", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "branch_manager")
      return res.status(403).json({ error: "Access denied" });

    const branchManagerId = req.user.id;

    // Get all branches for this branch manager
    const [branches] = await db.query(
      `SELECT branch_id FROM branches WHERE user_id = ?`,
      [branchManagerId]
    );

    if (!branches.length) return res.status(200).json([]); // no branches yet

    const branchIds = branches.map((b) => b.branch_id);

    const [results] = await db.query(
      `
      SELECT 
        p.*, 
        i.stock, 
        i.stock_threshold, 
        i.branch_id,
        b.branch_name,
        b.branch_contact,
        br.barangay_name,
        br.municipality
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      JOIN branches b ON i.branch_id = b.branch_id
      JOIN barangays br ON b.barangay_id = br.barangay_id
      WHERE i.branch_id IN (?)
      ORDER BY p.product_id DESC
    `,
      [branchIds]
    );

    res.status(200).json(results.map(formatProductImage));
  } catch (err) {
    console.error("❌ Error fetching branch products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ==============================
// Add Product
// ==============================
router.post("/admin/add-product", authenticateToken, authorizeAdmin, upload.single("image"), async (req, res) => {
  try {
    const {
      product_name,
      product_description,
      price,
      discounted_price,
      discount_until,
      refill_price,
      product_type
    } = req.body;

    const image_url = req.file ? req.file.filename : null;

    // Validate product fields
    const validationError = validateProductFields(product_type, discounted_price);
    if (validationError) return res.status(400).json({ error: validationError });

    // Insert product into products table
    const sql = `
      INSERT INTO products (
        image_url, product_name, product_description,
        price, discounted_price, discount_until, refill_price,
        product_type, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    const [result] = await db.query(sql, [
      image_url,
      product_name,
      product_description,
      price,
      discounted_price || null,
      normalizeDate(discount_until),
      refill_price || null,
      product_type,
    ]);

    // Fetch the inserted product
    const [rows] = await db.query("SELECT * FROM products WHERE product_id = ?", [result.insertId]);
    res.status(200).json({ message: "✅ Product added successfully!", product: formatProductImage(rows[0]) });

  } catch (err) {
    console.error("❌ Error adding product:", err);
    res.status(500).json({ error: "Failed to add product." });
  }
});

// GET universal products - accessible to any authenticated user
router.get("/universal", authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT *
      FROM products
      WHERE is_active = 1
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql);

    // Optionally format images
    const products = rows.map(formatProductImage);

    res.status(200).json(products);
  } catch (err) {
    console.error("❌ Error fetching universal products:", err);
    res.status(500).json({ error: "Failed to fetch products." });
  }
});


// ==============================
// Public Products
// ==============================
router.get("/public/products", async (req, res) => {
  const { type } = req.query;
  let whereClause = "WHERE p.is_active = 1";
  
  if (type === "regular" || type === "discounted") {
    whereClause += ` AND p.product_type = ${db.escape(type)}`;
  }

  try {
    const sql = `
      SELECT 
        p.*, 
        i.stock, 
        i.stock_threshold, 
        b.branch_id, 
        b.branch_name AS seller_name,
        br.municipality AS municipality, 
        br.barangay_name AS barangay
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.product_id
      LEFT JOIN branches b ON i.branch_id = b.branch_id
      LEFT JOIN barangays br ON b.barangay_id = br.barangay_id
      ${whereClause}
      ORDER BY p.product_id DESC
    `;

    const [rows] = await db.query(sql);
    res.json(rows.map(formatProductImage));
  } catch (err) {
    console.error("❌ Failed to fetch public products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// All products
router.get("/all-products", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.product_id,
        p.image_url,
        p.product_type,
        p.product_name,
        p.product_description,
        p.price,
        p.discounted_price,
        p.refill_price,
        p.discount_until,
        p.is_active,
        p.created_at AS product_created_at,
        i.inventory_id,
        i.branch_id,
        i.stock,
        i.stock_threshold,
        i.updated_at AS inventory_updated_at,
        b.branch_name,
        b.branch_contact,
        b.branch_picture,
        br.barangay_name,
        br.municipality
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.product_id
      LEFT JOIN branches b ON b.branch_id = i.branch_id
      LEFT JOIN barangays br ON br.barangay_id = b.barangay_id
      WHERE p.is_active = 1
      ORDER BY p.product_name ASC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("❌ Failed to fetch all products:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
    });
  }
});

// ==============================
// Admin Products
// ==============================
router.get("/admin/all-products", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") 
      return res.status(403).json({ error: "Admins only" });

    const { branch } = req.query;
    let whereClause = "";
    if (branch && branch !== "All") {
      // Filter by municipality from barangays table
      whereClause = `WHERE br.municipality = ${db.escape(branch)}`;
    }

    const sql = `
      SELECT 
        p.*, 
        i.stock, 
        i.stock_threshold, 
        b.branch_id, 
        br.municipality, 
        br.barangay_name
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.product_id
      LEFT JOIN branches b ON i.branch_id = b.branch_id
      LEFT JOIN barangays br ON b.barangay_id = br.barangay_id
      ${whereClause}
      ORDER BY p.product_id DESC
    `;
    const [rows] = await db.query(sql);
    res.json(rows.map(formatProductImage));
  } catch (err) {
    console.error("❌ Admin fetch error:", err);
    res.status(500).json({ error: "Failed to fetch admin products." });
  }
});

// ==============================
// Update Product (Admin or Branch Manager)
// ==============================
router.put("/update/:id", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_name,
      product_description,
      price,
      discounted_price,
      discount_until,
      refill_price,
      stock,
      stock_threshold,
      product_type
    } = req.body;

    // Optional image
    const image_url = req.file ? req.file.filename : null;

    // Validate discounted price
    const validationError = validateProductFields(product_type, discounted_price);
    if (validationError) return res.status(400).json({ error: validationError });

    // Fetch existing product
    let existingSql = `
      SELECT p.*, i.branch_id
      FROM products p
      JOIN inventory i ON i.product_id = p.product_id
      WHERE p.product_id = ?
    `;
    const params = [id];
    if (req.user.role !== "admin") existingSql += " AND i.branch_id IN (SELECT branch_id FROM branches WHERE user_id = ?)";
    if (req.user.role !== "admin") params.push(req.user.id);

    const [existing] = await db.query(existingSql, params);
    if (existing.length === 0) return res.status(404).json({ error: "Product not found or not accessible." });

    const oldImage = existing[0].image_url;

    // --------- Update Products ---------
    const updateFields = [];
    const values = [];

    const fieldsToCheck = {
      product_name,
      product_description,
      price,
      discounted_price,
      discount_until: discount_until ? normalizeDate(discount_until) : undefined,
      refill_price,
      product_type,
      image_url
    };

    for (const [key, value] of Object.entries(fieldsToCheck)) {
      if (value !== undefined && value !== null && value !== existing[0][key]) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length > 0) {
      const sql = `UPDATE products SET ${updateFields.join(", ")} WHERE product_id = ?`;
      values.push(id);
      await db.query(sql, values);
    }

    // --------- Update Inventory ONLY if explicitly provided ---------
    const inventoryUpdates = [];
    const inventoryValues = [];

    if (stock !== undefined) {
      inventoryUpdates.push("stock = ?");
      inventoryValues.push(stock);
    }

    if (stock_threshold !== undefined) {
      inventoryUpdates.push("stock_threshold = ?");
      inventoryValues.push(stock_threshold);
    }

    if (inventoryUpdates.length > 0) {
      const invSql = `UPDATE inventory SET ${inventoryUpdates.join(", ")} WHERE product_id = ?`;
      inventoryValues.push(id);
      await db.query(invSql, inventoryValues);
    }

    // --------- Delete old image if replaced ---------
    if (image_url && oldImage) {
      deleteImageIfExists(path.join(uploadPath, oldImage));
    }

    res.status(200).json({ message: "✅ Product updated successfully!" });
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ error: "Failed to update product.", details: err.sqlMessage || err.message });
  }
});

// ==============================
// Restock Product
// ==============================
router.put("/restock/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, branch_id } = req.body;
    const userId = req.user.id;

    const qty = Number(quantity);
    if (!qty || qty <= 0)
      return res.status(400).json({ error: "Invalid restock quantity." });
    if (!branch_id)
      return res.status(400).json({ error: "branch_id is required." });

    // Check inventory ownership
    const sqlCheck =
      req.user.role === "admin"
        ? "SELECT * FROM inventory WHERE product_id = ? AND branch_id = ?"
        : `SELECT i.* FROM inventory i 
           JOIN branches b ON i.branch_id = b.branch_id
           WHERE i.product_id = ? AND i.branch_id = ? AND b.user_id = ?`;

    const [rows] =
      req.user.role === "admin"
        ? await db.query(sqlCheck, [id, branch_id])
        : await db.query(sqlCheck, [id, branch_id, userId]);

    if (!rows || rows.length === 0)
      return res
        .status(404)
        .json({ error: "Product not found or not accessible." });

    const previousStock = Number(rows[0].stock) || 0;
    const newStock = previousStock + qty;

    // Update stock
    await db.query(
      "UPDATE inventory SET stock = ?, updated_at = NOW() WHERE product_id = ? AND branch_id = ?",
      [newStock, id, branch_id]
    );

    // Log restock without branch_id
    await db.query(
      `INSERT INTO inventory_logs 
        (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, 'full', userId, 'restock', qty, previousStock, newStock, 'Restocked']
    );

    res.status(200).json({
      success: true,
      message: "Product restocked successfully.",
      previousStock,
      newStock,
    });
  } catch (err) {
    console.error("❌ Error restocking product:", err);
    res.status(500).json({ error: "Failed to restock product." });
  }
});

// ==============================
// Branch Manager: Their Own Restock History
// ==============================
router.get("/my-products-restock", authenticateToken, async (req, res) => {
  try {
    // Only branch managers can access
    if (req.user.role !== "branch_manager") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const userId = req.user.id;

    const [rows] = await db.query(`
      SELECT 
          il.log_id,
          il.product_id,
          il.state,
          il.type,
          il.quantity,
          il.previous_stock,
          il.new_stock,
          il.description,
          il.created_at AS restocked_at, -- alias for frontend

          -- Product info
          COALESCE(p.product_name, 'Deleted Product') AS product_name,
          COALESCE(p.image_url, '') AS image_url,
          p.product_type,
          p.price,
          p.discounted_price,
          p.refill_price,
          p.discount_until,

          -- User info (branch manager who restocked)
          il.user_id AS restocked_by,
          u.name AS restocked_by_name,
          u.email AS restocked_by_email,
          u.contact_number AS restocked_by_contact
          
      FROM inventory_logs il
      LEFT JOIN products p ON il.product_id = p.product_id
      LEFT JOIN users u ON il.user_id = u.user_id
      WHERE il.type = 'restock'
        AND il.user_id = ?
      ORDER BY il.created_at DESC
    `, [userId]);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error("❌ Branch manager restock history error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ==============================
// Single Product
// ==============================
router.get("/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    const sql = `
      SELECT 
        p.*, 
        i.stock, 
        i.stock_threshold, 
        b.branch_id, 
        b.branch_name,
        br.municipality, 
        br.barangay_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.product_id
      LEFT JOIN branches b ON i.branch_id = b.branch_id
      LEFT JOIN barangays br ON b.barangay_id = br.barangay_id
      WHERE i.product_id = ?
      LIMIT 1
    `;

    const [results] = await db.query(sql, [productId]);

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found in inventory" });
    }

    // Assuming formatProductImage handles undefined or null values
    res.status(200).json(formatProductImage(results[0]));
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// ==============================
// Serve Images
// ==============================
router.use("/images", express.static(uploadPath));

module.exports = router;
