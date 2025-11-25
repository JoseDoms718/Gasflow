require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");

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
const BASE_PRODUCT_QUERY = `
  SELECT 
    p.*, 
    u.name AS seller_name,
    b.municipality AS branch,
    b.barangay_name AS barangay,
    i.stock,
    i.stock_threshold
  FROM products p
  JOIN users u ON p.seller_id = u.user_id
  LEFT JOIN barangays b ON u.barangay_id = b.barangay_id
  LEFT JOIN inventory i ON p.product_id = i.product_id
`;

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

async function fetchProducts(whereClause, res) {
  try {
    const sql = `${BASE_PRODUCT_QUERY} ${whereClause} ORDER BY p.product_id DESC`;
    const [results] = await db.query(sql);
    res.status(200).json(results.map(formatProductImage));
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
}

// ==============================
// Add Product
// ==============================
router.post("/add", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const {
      product_name,
      product_description,
      price,
      discounted_price,
      discount_until,
      refill_price,
      stock,
      stock_threshold,
      product_type,
    } = req.body;

    const seller_id = req.user.id;
    const image_url = req.file ? req.file.filename : null;

    const validationError = validateProductFields(product_type, discounted_price);
    if (validationError) return res.status(400).json({ error: validationError });

    const sql = `
      INSERT INTO products (
        seller_id, image_url, product_name, product_description,
        price, discounted_price, discount_until, refill_price,
        product_type, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    const [result] = await db.query(sql, [
      seller_id,
      image_url,
      product_name,
      product_description,
      price,
      discounted_price || null,
      normalizeDate(discount_until),
      refill_price || null,
      product_type,
    ]);

    const inventorySql = `INSERT INTO inventory (product_id, stock, stock_threshold) VALUES (?, ?, ?)`;
    await db.query(inventorySql, [result.insertId, stock || 0, stock_threshold || 0]);

    const [rows] = await db.query("SELECT * FROM products WHERE product_id = ?", [result.insertId]);
    res.status(200).json({ message: "✅ Product added successfully!", product: formatProductImage(rows[0]) });
  } catch (err) {
    console.error("❌ Error adding product:", err);
    res.status(500).json({ error: "Failed to add product." });
  }
});

// ==============================
// Get Seller’s Own Products
// ==============================
router.get("/my-products", authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.*, 
        i.stock, i.stock_threshold
      FROM products p
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE p.seller_id = ?
      ORDER BY p.product_id DESC
    `;
    const [results] = await db.query(sql, [req.user.id]);
    res.status(200).json(results.map(formatProductImage));
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ==============================
// Public Products
// ==============================
router.get("/public/products", async (req, res) => {
  const { type, role } = req.query;

  // Base where clause: active products only, exclude retailers
  let whereClause = "WHERE p.is_active = 1 AND u.role != 'retailer'";

  // Optional type filter
  if (type === "regular" || type === "discounted") {
    whereClause += ` AND p.product_type = ${db.escape(type)}`;
  }

  // Optional role filter (if provided, e.g., only business_owner or users)
  if (role) {
    whereClause += ` AND u.role = ${db.escape(role)}`;
  }

  try {
    const sql = `
      SELECT 
        p.*,
        u.name AS seller_name,
        u.role AS seller_role,
        b.barangay_name AS barangay,
        b.municipality,
        i.stock,
        i.stock_threshold,
        i.updated_at AS stock_updated_at
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.user_id
      LEFT JOIN barangays b ON u.barangay_id = b.barangay_id
      LEFT JOIN inventory i ON p.product_id = i.product_id
      ${whereClause}
      ORDER BY p.product_id DESC
    `;

    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});


// ==============================
// Restock History - Admin & Seller
// ==============================
router.get("/admin/branch-managers-restock", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, error: "Access denied" });

    // Fetch restock history for products owned by branch managers
    const [rows] = await db.query(`
      SELECT 
        rh.id AS restock_id,
        rh.product_id,
        p.product_name,
        p.seller_id,
        p.image_url,
        rh.previous_stock,
        rh.quantity,
        rh.new_stock,
        rh.restocked_by,
        u.name AS restocked_by_name,
        rh.restocked_at
      FROM restock_history rh
      JOIN products p ON rh.product_id = p.product_id
      JOIN users u ON rh.restocked_by = u.user_id
      JOIN users u1 ON p.seller_id = u1.user_id
      WHERE u1.role = 'branch_manager'
      ORDER BY rh.restocked_at DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Admin branch-manager restock error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


router.get("/my-products-restock", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(`
      SELECT 
        rh.id AS restock_id,
        rh.product_id,
        p.product_name,
        p.seller_id,
        p.image_url,
        rh.previous_stock,
        rh.quantity,
        rh.new_stock,
        rh.restocked_by,
        u.name AS restocked_by_name,
        rh.restocked_at
      FROM restock_history rh
      JOIN products p ON rh.product_id = p.product_id
      LEFT JOIN users u ON rh.restocked_by = u.user_id
      WHERE p.seller_id = ?
      ORDER BY rh.restocked_at DESC
    `, [userId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Seller restock history error:", err);
    res.status(500).json({ success: false, error: "Server error" });
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
      whereClause = `WHERE b.municipality = ${db.escape(branch)}`;
    }
    await fetchProducts(whereClause, res);
  } catch (err) {
    console.error("❌ Admin fetch error:", err);
    res.status(500).json({ error: "Failed to fetch admin products." });
  }
});

// ==============================
// Update Product (Admin or Seller)
// ==============================
router.put("/update/:id", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const seller_id = req.user.id;
    const {
      product_name, product_description, price, discounted_price,
      discount_until, refill_price, stock, stock_threshold, product_type
    } = req.body;

    const image_url = req.file ? req.file.filename : null;
    const validationError = validateProductFields(product_type, discounted_price);
    if (validationError) return res.status(400).json({ error: validationError });

    let existing;
    if (req.user.role === "admin") {
      [existing] = await db.query("SELECT image_url FROM products WHERE product_id = ?", [id]);
    } else {
      [existing] = await db.query(
        "SELECT image_url FROM products WHERE product_id = ? AND seller_id = ?",
        [id, seller_id]
      );
    }

    if (existing.length === 0)
      return res.status(404).json({ error: "Product not found or not accessible." });

    const oldImage = existing[0].image_url;

    let sql = `
      UPDATE products
      SET product_name = ?, product_description = ?, price = ?, discounted_price = ?, 
          discount_until = ?, refill_price = ?, product_type = ?
    `;
    const values = [
      product_name, product_description, price, discounted_price || null,
      normalizeDate(discount_until), refill_price || null, product_type
    ];

    if (image_url) {
      sql += `, image_url = ?`;
      values.push(image_url);
    }

    if (req.user.role === "admin") sql += ` WHERE product_id = ?`, values.push(id);
    else sql += ` WHERE product_id = ? AND seller_id = ?`, values.push(id, seller_id);

    await db.query(sql, values);

    if (typeof stock !== "undefined" || typeof stock_threshold !== "undefined") {
      await db.query(
        `UPDATE inventory SET stock = ?, stock_threshold = ? WHERE product_id = ?`,
        [stock || 0, stock_threshold || 0, id]
      );
    }

    if (image_url && oldImage) deleteImageIfExists(path.join(uploadPath, oldImage));

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
    const { quantity } = req.body;
    const userId = req.user.id;

    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Invalid restock quantity." });

    const sqlCheck =
      req.user.role === "admin"
        ? "SELECT * FROM inventory WHERE product_id = ?"
        : `SELECT i.* FROM inventory i JOIN products p ON i.product_id = p.product_id WHERE i.product_id = ? AND p.seller_id = ?`;

    const [rows] =
      req.user.role === "admin" ? await db.query(sqlCheck, [id]) : await db.query(sqlCheck, [id, userId]);

    if (!rows || rows.length === 0) return res.status(404).json({ error: "Product not found or not accessible." });

    const previousStock = Number(rows[0].stock) || 0;
    const newStock = previousStock + qty;

    await db.query("UPDATE inventory SET stock = ?, updated_at = NOW() WHERE product_id = ?", [newStock, id]);
    await db.query(
      `INSERT INTO restock_history (product_id, restocked_by, quantity, previous_stock, new_stock, restocked_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, userId, qty, previousStock, newStock]
    );

    res.status(200).json({ success: true, message: "Product restocked successfully.", previousStock, newStock });
  } catch (err) {
    console.error("❌ Error restocking product:", err);
    res.status(500).json({ error: "Failed to restock product." });
  }
});

// ==============================
// Single Product (dynamic, LAST)
// ==============================
router.get("/:id", async (req, res) => {
  try {
    const sql = `${BASE_PRODUCT_QUERY} WHERE p.product_id = ?`;
    const [results] = await db.query(sql, [req.params.id]);

    if (results.length === 0) return res.status(404).json({ error: "Product not found" });

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
