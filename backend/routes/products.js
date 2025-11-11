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
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
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
      ? `http://localhost:5000/products/images/${p.image_url}`
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
  let whereClause = "WHERE p.is_active = 1";

  if (type === "regular" || type === "discounted") {
    whereClause += ` AND p.product_type = '${type}'`;
  }

  if (role) {
    whereClause += ` AND u.role = ${db.escape(role)}`;
  }

  await fetchProducts(whereClause, res);
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
// Get Single Product
// ==============================
router.get("/:id", async (req, res) => {
  try {
    const sql = `${BASE_PRODUCT_QUERY} WHERE p.product_id = ?`;
    const [results] = await db.query(sql, [req.params.id]);

    if (results.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.status(200).json(formatProductImage(results[0]));
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res.status(500).json({ error: "Failed to fetch product" });
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
      product_name,
      product_description,
      price,
      discounted_price || null,
      normalizeDate(discount_until),
      refill_price || null,
      product_type,
    ];

    if (image_url) {
      sql += `, image_url = ?`;
      values.push(image_url);
    }

    if (req.user.role === "admin") {
      sql += ` WHERE product_id = ?`;
      values.push(id);
    } else {
      sql += ` WHERE product_id = ? AND seller_id = ?`;
      values.push(id, seller_id);
    }

    await db.query(sql, values);

    // Update inventory if provided
    if (typeof stock !== "undefined" || typeof stock_threshold !== "undefined") {
      const invSql = `
        UPDATE inventory
        SET stock = ?, stock_threshold = ?
        WHERE product_id = ?
      `;
      await db.query(invSql, [stock || 0, stock_threshold || 0, id]);
    }

    if (image_url && oldImage) deleteImageIfExists(path.join(uploadPath, oldImage));

    res.status(200).json({ message: "✅ Product updated successfully!" });
  } catch (err) {
    console.error("❌ Error updating product:", err.message || err);
    res.status(500).json({
      error: "Failed to update product.",
      details: err.sqlMessage || err.message || err,
    });
  }
});

// ==============================
// Restock Product (Admin or Seller)
// ==============================
router.put("/restock/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (!quantity || quantity <= 0)
      return res.status(400).json({ error: "Invalid restock quantity." });

    const sqlCheck =
      req.user.role === "admin"
        ? "SELECT * FROM inventory WHERE product_id = ?"
        : "SELECT i.* FROM inventory i JOIN products p ON i.product_id = p.product_id WHERE i.product_id = ? AND p.seller_id = ?";

    const [rows] =
      req.user.role === "admin"
        ? await db.query(sqlCheck, [id])
        : await db.query(sqlCheck, [id, userId]);

    if (rows.length === 0)
      return res.status(404).json({ error: "Product not found or not accessible." });

    const newStock = rows[0].stock + Number(quantity);
    await db.query("UPDATE inventory SET stock = ? WHERE product_id = ?", [newStock, id]);

    res.status(200).json({
      message: `✅ Product restocked successfully! New stock: ${newStock}`,
      newStock,
    });
  } catch (err) {
    console.error("❌ Error restocking product:", err);
    res.status(500).json({ error: "Failed to restock product." });
  }
});

// ==============================
// Delete Product
// ==============================
router.delete("/delete/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const seller_id = req.user.id;

    const [result] = await db.query(
      "SELECT image_url FROM products WHERE product_id = ? AND seller_id = ?",
      [id, seller_id]
    );

    if (result.length === 0)
      return res.status(404).json({ error: "Product not found or not owned by you." });

    const imagePath = result[0].image_url ? path.join(uploadPath, result[0].image_url) : null;

    await db.query("DELETE FROM products WHERE product_id = ? AND seller_id = ?", [id, seller_id]);
    await db.query("DELETE FROM inventory WHERE product_id = ?", [id]);

    deleteImageIfExists(imagePath);

    res.status(200).json({ message: "✅ Product deleted successfully!" });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ error: "Failed to delete product." });
  }
});

// ==============================
// Serve Images
// ==============================
router.use("/images", express.static(uploadPath));

module.exports = router;
