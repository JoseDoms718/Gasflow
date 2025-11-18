require('dotenv').config();
const express = require("express");
const router = express.Router();
const db = require("../config/db"); // adjust the path to your database module
const authenticateToken = require("../middleware/authtoken");

// Report a damaged product
router.put("/damage/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; // product_id
    const { quantity, damage_description } = req.body;
    const userId = req.user.id;

    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Invalid damage quantity." });

    // Check if product exists and belongs to user (if not admin)
    const sqlCheck =
      req.user.role === "admin"
        ? "SELECT * FROM inventory WHERE product_id = ?"
        : `SELECT i.* FROM inventory i 
           JOIN products p ON i.product_id = p.product_id 
           WHERE i.product_id = ? AND p.seller_id = ?`;

    const [rows] =
      req.user.role === "admin" ? await db.query(sqlCheck, [id]) : await db.query(sqlCheck, [id, userId]);

    if (!rows || rows.length === 0) return res.status(404).json({ error: "Product not found or not accessible." });

    const previousStock = Number(rows[0].stock) || 0;
    if (qty > previousStock) return res.status(400).json({ error: "Damage quantity exceeds current stock." });

    const newStock = previousStock - qty;

    // Update inventory
    await db.query("UPDATE inventory SET stock = ?, updated_at = NOW() WHERE product_id = ?", [newStock, id]);

    // Insert into damaged_products
    await db.query(
      `INSERT INTO damaged_products 
        (product_id, quantity, previous_stock, new_stock, reported_by, damage_description, damaged_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, qty, previousStock, newStock, userId, damage_description]
    );

    res.status(200).json({ 
      success: true, 
      message: "Product marked as damaged successfully.", 
      previousStock, 
      newStock 
    });
  } catch (err) {
    console.error("❌ Error reporting damaged product:", err);
    res.status(500).json({ error: "Failed to report damaged product." });
  }
});

// Get damaged products for the logged-in user
router.get("/my-damaged-products", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
  SELECT 
    dp.id AS damage_id,
    dp.product_id,
    p.product_name,
    p.price,
    p.discounted_price,
    p.product_type,
    p.seller_id,
    p.image_url,
    dp.previous_stock,
    dp.quantity,
    dp.new_stock,
    dp.reported_by,
    u.name AS reported_by_name,
    dp.damage_description,
    dp.damaged_at
  FROM damaged_products dp
  JOIN products p ON dp.product_id = p.product_id
  LEFT JOIN users u ON dp.reported_by = u.user_id
  ${req.user.role === "admin" ? "" : "WHERE p.seller_id = ?"}
  ORDER BY dp.damaged_at DESC
`;

    const [rows] = req.user.role === "admin"
      ? await db.query(sql)
      : await db.query(sql, [userId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Fetch damaged products error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;