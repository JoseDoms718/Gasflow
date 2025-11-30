require('dotenv').config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");


// --------------------------------------------------
// REPORT DAMAGED PRODUCT
// --------------------------------------------------
router.put("/damage/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, damage_description } = req.body;
    const userId = req.user.id;
    const qty = Number(quantity);

    if (!qty || qty <= 0)
      return res.status(400).json({ error: "Invalid damage quantity." });

    // CHECK IF USER HAS ACCESS TO THIS PRODUCT'S BRANCH
    const sqlCheck =
      req.user.role === "admin"
        ? `
          SELECT i.*
          FROM inventory i
          WHERE i.product_id = ?
        `
        : `
          SELECT i.*
          FROM inventory i
          JOIN branches b ON b.branch_id = i.branch_id
          WHERE i.product_id = ? AND b.user_id = ?
        `;

    const params =
      req.user.role === "admin"
        ? [id]
        : [id, userId];

    const [rows] = await db.query(sqlCheck, params);

    if (!rows.length)
      return res.status(404).json({ error: "Product not found or not accessible." });

    const previousStock = Number(rows[0].stock) || 0;

    if (qty > previousStock)
      return res.status(400).json({ error: "Damage quantity exceeds current stock." });

    const newStock = previousStock - qty;

    // UPDATE INVENTORY
    await db.query(
      `UPDATE inventory 
       SET stock = ?, updated_at = NOW()
       WHERE product_id = ?`,
      [newStock, id]
    );

    // INSERT DAMAGE LOG
    await db.query(
      `INSERT INTO inventory_logs 
        (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
       VALUES (?, 'n/a', ?, 'damage', ?, ?, ?, ?, NOW())`,
      [id, userId, qty, previousStock, newStock, damage_description]
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


// --------------------------------------------------
// GET DAMAGED PRODUCTS (FILTER BY BRANCH OWNER)
// --------------------------------------------------
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
        p.image_url,
        il.previous_stock,
        il.quantity,
        il.new_stock,
        il.user_id AS reported_by,
        u.name AS user_name,
        il.description AS damage_description,
        il.created_at AS created_at,
        br.branch_name,
        bg.municipality
      FROM inventory_logs il
      JOIN products p ON il.product_id = p.product_id
      LEFT JOIN users u ON il.user_id = u.user_id
      LEFT JOIN inventory i ON il.product_id = i.product_id
      LEFT JOIN branches br ON i.branch_id = br.branch_id
      LEFT JOIN barangays bg ON br.barangay_id = bg.barangay_id
      WHERE il.type = 'damage'
      ${req.user.role === "admin" ? "" : "AND br.user_id = ?"}
      ORDER BY il.created_at DESC
    `;

    const params =
      req.user.role === "admin"
        ? []
        : [userId];

    const [rows] = await db.query(sql, params);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error("❌ Fetch damaged products error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
