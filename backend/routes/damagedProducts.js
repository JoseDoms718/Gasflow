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

    // Insert into inventory_logs
    await db.query(
      `INSERT INTO inventory_logs 
        (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, 'n/a', userId, 'damage', qty, previousStock, newStock, damage_description]
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
        il.log_id AS damage_id,
        il.product_id,
        p.product_name,
        p.price,
        p.discounted_price,
        p.product_type,
        p.seller_id,
        p.image_url,
        il.previous_stock,
        il.quantity,
        il.new_stock,
        il.user_id AS reported_by,
        u.name AS user_name,
        il.description AS damage_description,
        il.created_at AS damaged_at,
        b.municipality
      FROM inventory_logs il
      JOIN products p ON il.product_id = p.product_id
      LEFT JOIN users u ON il.user_id = u.user_id
      LEFT JOIN users seller ON p.seller_id = seller.user_id
      LEFT JOIN barangays b ON seller.barangay_id = b.barangay_id
      WHERE il.type = 'damage'
      ${req.user.role === "admin" ? "" : "AND p.seller_id = ?"}
      ORDER BY il.created_at DESC
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
