
require('dotenv').config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");

// Utilities & constants
const PH_PHONE_REGEX = /^\+639\d{9}$/;
const ALLOWED_BUYER_STATUSES = ["pending", "cancelled"];
const ALLOWED_SELLER_STATUSES = [
  "pending",
  "preparing",
  "on_delivery",
  "delivered",
  "cancelled",
];

// Role check middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden: Access denied." });
    }
    next();
  };
}


const formatImageUrl = (fileName, type = "product") => {
  if (!fileName) return null;

  if (fileName.startsWith("http")) return fileName; // already full URL

  if (type === "product") {
    return `${process.env.BASE_URL}/products/images/${fileName}`;
  } else if (type === "bundle") {
    return `${process.env.BASE_URL}/products/bundles/${fileName}`;
  }

  return fileName;
};


/* -------------------------------------------------------------------
   GROUP ORDERS helper (keeps previous response shape but uses
   barangay/municipality fields returned from queries)
------------------------------------------------------------------- */
function groupOrders(rows, itemFormatter) {
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.order_id]) {
      grouped[row.order_id] = {
        order_id: row.order_id,
        full_name: row.full_name,
        contact_number: row.contact_number,
        barangay: row.barangay,
        municipality: row.municipality,
        status: row.status,
        total_price: row.total_price,
        ordered_at: row.ordered_at,
        delivered_at: row.delivered_at,
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_email,
        items: [],
        inventory_deducted: row.inventory_deducted ?? 0,
      };
    }

    // Include seller_name in each item
    grouped[row.order_id].items.push(
      itemFormatter({
        ...row,
        seller_name: row.seller_name || "N/A", // fallback just in case
      })
    );
  }
  return Object.values(grouped);
}

/* -------------------------------------------
   Inventory adjust helper (supports transaction connection)
-------------------------------------------- */
async function adjustInventory(product_id, delta, connection = null) {
  const q = connection ? connection.query.bind(connection) : db.query.bind(db);

  // Try updating existing inventory row
  const [updateRes] = await q(
    "UPDATE inventory SET stock = stock + ? WHERE product_id = ?",
    [delta, product_id]
  );

  // `updateRes.affectedRows` exists for mysql2
  if (!updateRes.affectedRows) {
    if (delta > 0) {
      // Create new inventory row when adding stock
      await q(
        "INSERT INTO inventory (product_id, stock, stock_threshold) VALUES (?, ?, ?)",
        [product_id, delta, 0]
      );
      return;
    } else {
      // No inventory row to decrement — signal failure
      throw new Error("Inventory row not found for product and cannot decrement stock.");
    }
  }
}

/* -------------------------------------------
   Fetch barangay by id (returns barangay_name & municipality)
   Note: municipality column in barangays table contains municipality text.
-------------------------------------------- */
async function fetchBarangay(barangay_id) {
  const [rows] = await db.query(
    `SELECT barangay_name, municipality FROM barangays WHERE barangay_id = ?`,
    [barangay_id]
  );
  return rows[0];
}

/* -------------------------------------------------------------------
   Ensure orders.inventory_deducted column exists
------------------------------------------------------------------- */
(async function ensureInventoryFlag() {
  try {
    await db.query(
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS inventory_deducted TINYINT(1) DEFAULT 0"
    );
  } catch (err) {
    try {
      await db.query("ALTER TABLE orders ADD COLUMN inventory_deducted TINYINT(1) DEFAULT 0");
    } catch (err2) {
      console.warn("Could not add orders.inventory_deducted column automatically:", err2.message);
    }
  }
})();

/* -------------------------------------------------------------------
   WALK-IN ORDER (auto-delivered)
------------------------------------------------------------------- */
router.post("/walk-in", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const io = req.app.get("io"); // Socket.IO instance
    let { items, full_name, contact_number, barangay_id, delivery_address } = req.body;
    const buyer_id = req.user.id;

    // --- Validate buyer info ---
    if (!full_name || !contact_number || !barangay_id || !delivery_address) {
      connection.release();
      return res.status(400).json({ success: false, error: "Missing required buyer fields." });
    }

    if (!PH_PHONE_REGEX.test(contact_number)) {
      connection.release();
      return res.status(400).json({ success: false, error: "Invalid Philippine contact number format (+639XXXXXXXXX)." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, error: "No items provided." });
    }

    const [barangayRows] = await db.query(
      "SELECT barangay_name, municipality FROM barangays WHERE barangay_id = ? LIMIT 1",
      [barangay_id]
    );
    if (!barangayRows.length) {
      connection.release();
      return res.status(404).json({ success: false, error: "Barangay not found." });
    }

    // --- Group items by branch and check stock ---
    const branchMap = {};

    for (const item of items) {
      if (item.product_id) {
        // --- Regular product stock check ---
        const [rows] = await db.query(
          `SELECT p.product_id,
                  bpp.price AS branch_price,
                  bpp.discounted_price AS branch_discounted_price,
                  bpp.refill_price AS branch_refill_price,
                  i.branch_id,
                  i.stock
           FROM products p
           INNER JOIN inventory i ON p.product_id = i.product_id
           INNER JOIN branch_product_prices bpp ON p.product_id = bpp.product_id AND i.branch_id = bpp.branch_id
           WHERE p.product_id = ? AND i.branch_id = ? AND i.state = 'full'
           LIMIT 1`,
          [item.product_id, item.branch_id]
        );
        const product = rows[0];
        if (!product) {
          connection.release();
          return res.status(400).json({ success: false, error: `Product ${item.product_id} not available in the selected branch.` });
        }

        if (product.stock < item.quantity) {
          connection.release();
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for product ${item.product_id}. Required: ${item.quantity}, Available: ${product.stock}`,
          });
        }

        const finalPrice =
          item.type === "refill"
            ? product.branch_refill_price ?? 0
            : item.type === "discounted" && product.branch_discounted_price != null
            ? product.branch_discounted_price
            : product.branch_price;

        branchMap[product.branch_id] = branchMap[product.branch_id] || [];
        branchMap[product.branch_id].push({
          product_id: product.product_id,
          quantity: item.quantity,
          price: finalPrice,
          type: item.type,
          stock: product.stock,
          branch_price_at_sale: product.branch_price,
          sold_discounted_price: product.branch_discounted_price,
        });

      } else if (item.branch_bundle_id) {
        // --- Bundle stock check ---
        if (!item.branch_id) {
          connection.release();
          return res.status(400).json({ success: false, error: `branch_id is required for branch_bundle_id ${item.branch_bundle_id}.` });
        }

        const [bundleRows] = await db.query(
          `SELECT bb.id AS branch_bundle_id, bb.branch_id, bb.bundle_id,
                  COALESCE(bbp.discounted_price, bbp.price, 0) AS final_price,
                  bbp.price AS branch_price,
                  bbp.discounted_price AS sold_discounted_price
           FROM branch_bundles bb
           LEFT JOIN branch_bundle_prices bbp ON bb.bundle_id = bbp.bundle_id AND bb.branch_id = bbp.branch_id
           WHERE bb.id = ? AND bb.branch_id = ?`,
          [item.branch_bundle_id, item.branch_id]
        );
        const bundle = bundleRows[0];
        if (!bundle) {
          connection.release();
          return res.status(400).json({ success: false, error: `Branch bundle ${item.branch_bundle_id} not found for branch ${item.branch_id}.` });
        }

        // Check full stock of all products in the bundle
        const [bundleItems] = await db.query(
          `SELECT bi.product_id, bi.quantity AS required_qty, i.stock
           FROM bundle_items bi
           INNER JOIN inventory i ON bi.product_id = i.product_id AND i.branch_id = ? AND i.state = 'full'
           WHERE bi.bundle_id = ?`,
          [item.branch_id, bundle.bundle_id]
        );

        for (const bi of bundleItems) {
          const totalRequired = bi.required_qty * item.quantity;
          if (bi.stock < totalRequired) {
            connection.release();
            return res.status(400).json({
              success: false,
              error: `Insufficient stock for product ${bi.product_id} in bundle ${item.branch_bundle_id}. Required: ${totalRequired}, Available: ${bi.stock}`,
            });
          }
        }

        branchMap[bundle.branch_id] = branchMap[bundle.branch_id] || [];
        branchMap[bundle.branch_id].push({
          branch_bundle_id: bundle.branch_bundle_id,
          quantity: item.quantity,
          price: bundle.final_price,
          type: "bundle",
          bundle_items: bundleItems,
          branch_price_at_sale: bundle.branch_price,
          sold_discounted_price: bundle.sold_discounted_price,
        });

      } else {
        connection.release();
        return res.status(400).json({ success: false, error: "Item must include product_id or branch_bundle_id." });
      }
    }

    // --- Transaction and order creation ---
    await connection.beginTransaction();
    const createdOrders = [];

    for (const [branch_id, branchItems] of Object.entries(branchMap)) {
      const totalBranchPrice = branchItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      const [orderResult] = await connection.query(
        `INSERT INTO orders (buyer_id, full_name, contact_number, barangay_id,
                             delivery_address, status, total_price, delivery_fee, is_active, ordered_at, delivered_at, inventory_deducted)
         VALUES (?, ?, ?, ?, ?, 'delivered', ?, 0, 1, NOW(), NOW(), 1)`,
        [buyer_id, full_name, contact_number, barangay_id, delivery_address, totalBranchPrice]
      );
      const order_id = orderResult.insertId;

      for (const item of branchItems) {
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, branch_bundle_id, quantity, price, type, branch_id, branch_price_at_sale, sold_discounted_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order_id,
            item.product_id || null,
            item.branch_bundle_id || null,
            item.quantity,
            item.price,
            item.type,
            branch_id,
            item.branch_price_at_sale || null,
            item.sold_discounted_price || null,
          ]
        );

        // --- Stock deduction logic for regular products ---
        if (item.product_id && item.type !== "refill") {
          const [fullRows] = await connection.query(
            "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'full'",
            [item.product_id, branch_id]
          );
          if (fullRows.length) {
            const fullInv = fullRows[0];
            const prevFullStock = fullInv.stock;
            const newFullStock = prevFullStock - item.quantity;
            await connection.query("UPDATE inventory SET stock = ? WHERE inventory_id = ?", [newFullStock, fullInv.inventory_id]);
            await connection.query(
              `INSERT INTO inventory_logs (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
               VALUES (?, 'full', ?, 'sales', ?, ?, ?, ?, NOW())`,
              [item.product_id, req.user.id, item.quantity, prevFullStock, newFullStock, `Walk-in sale Order #${order_id}`]
            );

            const [emptyRows] = await connection.query(
              "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'empty'",
              [item.product_id, branch_id]
            );
            if (emptyRows.length) {
              const emptyInv = emptyRows[0];
              const prevEmptyStock = emptyInv.stock;
              const newEmptyStock = prevEmptyStock + item.quantity;
              await connection.query("UPDATE inventory SET stock = ? WHERE inventory_id = ?", [newEmptyStock, emptyInv.inventory_id]);
              await connection.query(
                `INSERT INTO inventory_logs (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
                 VALUES (?, 'empty', ?, 'sales', ?, ?, ?, ?, NOW())`,
                [item.product_id, req.user.id, item.quantity, prevEmptyStock, newEmptyStock, `Walk-in sale Order #${order_id} added to empty state`]
              );
            } else {
              await connection.query(
                "INSERT INTO inventory (product_id, branch_id, stock, stock_threshold, state) VALUES (?, ?, ?, NULL, 'empty')",
                [item.product_id, branch_id, item.quantity]
              );
              await connection.query(
                `INSERT INTO inventory_logs (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
                 VALUES (?, 'empty', ?, 'sales', ?, 0, ?, ?, NOW())`,
                [item.product_id, req.user.id, item.quantity, item.quantity, `Walk-in sale Order #${order_id} created empty state`]
              );
            }
          }
        }

        // --- Stock deduction for bundle items (unchanged) ---
        if (item.bundle_items && item.bundle_items.length) {
          for (const bi of item.bundle_items) {
            const qtyToDeduct = bi.required_qty * item.quantity;

            const [fullRows] = await connection.query(
              "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'full'",
              [bi.product_id, branch_id]
            );
            if (!fullRows.length) continue;

            const fullInv = fullRows[0];
            const prevFullStock = fullInv.stock;
            const newFullStock = prevFullStock - qtyToDeduct;
            await connection.query("UPDATE inventory SET stock = ? WHERE inventory_id = ?", [newFullStock, fullInv.inventory_id]);
            await connection.query(
              `INSERT INTO inventory_logs (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
               VALUES (?, 'full', ?, 'sales', ?, ?, ?, ?, NOW())`,
              [bi.product_id, req.user.id, qtyToDeduct, prevFullStock, newFullStock, `Walk-in sale Order #${order_id} (bundle #${item.branch_bundle_id})`]
            );

            const [emptyRows] = await connection.query(
              "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'empty'",
              [bi.product_id, branch_id]
            );
            if (emptyRows.length) {
              const emptyInv = emptyRows[0];
              const prevEmptyStock = emptyInv.stock;
              const newEmptyStock = prevEmptyStock + qtyToDeduct;
              await connection.query("UPDATE inventory SET stock = ? WHERE inventory_id = ?", [newEmptyStock, emptyInv.inventory_id]);
              await connection.query(
                `INSERT INTO inventory_logs (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
                 VALUES (?, 'empty', ?, 'sales', ?, ?, ?, ?, NOW())`,
                [bi.product_id, req.user.id, qtyToDeduct, prevEmptyStock, newEmptyStock, `Walk-in sale Order #${order_id} (bundle #${item.branch_bundle_id}) added to empty state`]
              );
            } else {
              await connection.query(
                "INSERT INTO inventory (product_id, branch_id, stock, stock_threshold, state) VALUES (?, ?, ?, NULL, 'empty')",
                [bi.product_id, branch_id, qtyToDeduct]
              );
              await connection.query(
                `INSERT INTO inventory_logs (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
                 VALUES (?, 'empty', ?, 'sales', ?, 0, ?, ?, NOW())`,
                [bi.product_id, req.user.id, qtyToDeduct, qtyToDeduct, `Walk-in sale Order #${order_id} (bundle #${item.branch_bundle_id}) created empty state`]
              );
            }
          }
        }
      }

      const newOrder = { order_id, branch_id, total_price: totalBranchPrice, delivery_address, status: "delivered", items: branchItems };
      createdOrders.push(newOrder);
      io.emit("newOrder", newOrder);
    }

    await connection.commit();
    connection.release();
    return res.status(201).json({ success: true, message: "✅ Walk-in orders created successfully.", orders: createdOrders });

  } catch (err) {
    try { await connection.rollback(); connection.release(); } catch (e) {}
    console.error("❌ Error (walk-in):", err);
    return res.status(500).json({ success: false, error: "Failed to process walk-in order." });
  }
});

//buy endoint
router.post("/buy", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const io = req.app.get("io");
    let { items, full_name, contact_number, barangay_id, delivery_address } = req.body;
    const buyer_id = req.user.id;

    // --- Validate buyer info ---
    if (!full_name || !contact_number || !barangay_id || !delivery_address) {
      connection.release();
      return res.status(400).json({ success: false, error: "Missing required buyer fields." });
    }

    if (!PH_PHONE_REGEX.test(contact_number)) {
      connection.release();
      return res.status(400).json({ success: false, error: "Invalid Philippine contact number format (+639XXXXXXXXX)." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, error: "No items provided." });
    }

    const barangayRow = await fetchBarangay(barangay_id);
    if (!barangayRow) {
      connection.release();
      return res.status(404).json({ success: false, error: "Barangay not found." });
    }

    // --- Group items by branch and validate stock ---
    const branchMap = {};

    for (const item of items) {
      if (item.product_id) {
        // --- Individual product ---
        const [rows] = await db.query(
          `SELECT p.product_id,
                  bpp.price AS branch_price,
                  bpp.discounted_price AS branch_discounted_price,
                  bpp.refill_price AS branch_refill_price,
                  i.branch_id,
                  i.stock
           FROM products p
           INNER JOIN inventory i ON p.product_id = i.product_id
           INNER JOIN branch_product_prices bpp ON p.product_id = bpp.product_id AND i.branch_id = bpp.branch_id
           WHERE p.product_id = ? AND i.branch_id = ? AND i.state = 'full'
           LIMIT 1`,
          [item.product_id, item.branch_id]
        );
        const product = rows[0];
        if (!product) {
          connection.release();
          return res.status(400).json({
            success: false,
            error: `Product ${item.product_id} not available in the selected branch.`,
          });
        }

        if (product.stock < item.quantity) {
          connection.release();
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for product ${item.product_id}. Required: ${item.quantity}, Available: ${product.stock}`,
          });
        }

        const finalPrice =
          item.type === "refill"
            ? product.branch_refill_price ?? 0
            : item.type === "discounted" && product.branch_discounted_price != null
            ? product.branch_discounted_price
            : product.branch_price;

        branchMap[product.branch_id] = branchMap[product.branch_id] || [];
        branchMap[product.branch_id].push({
          product_id: product.product_id,
          quantity: item.quantity,
          price: finalPrice,
          type: item.type,
          branch_price_at_sale: product.branch_price,
          sold_discounted_price: product.branch_discounted_price ?? product.branch_price,
        });

      } else if (item.branch_bundle_id) {
        // --- Bundle ---
        if (!item.branch_id) {
          connection.release();
          return res.status(400).json({
            success: false,
            error: `branch_id is required for branch_bundle_id ${item.branch_bundle_id}.`
          });
        }

        const [bundleRows] = await db.query(
          `SELECT bb.id AS branch_bundle_id,
                  bb.branch_id,
                  COALESCE(bbp.discounted_price, bbp.price, 0) AS final_price,
                  bbp.price AS branch_price,
                  bb.bundle_id
           FROM branch_bundles bb
           LEFT JOIN branch_bundle_prices bbp
                  ON bb.bundle_id = bbp.bundle_id AND bb.branch_id = bbp.branch_id
           WHERE bb.id = ? AND bb.branch_id = ?`,
          [item.branch_bundle_id, item.branch_id]
        );

        const bundle = bundleRows[0];
        if (!bundle) {
          connection.release();
          return res.status(400).json({
            success: false,
            error: `Branch bundle ${item.branch_bundle_id} not found for branch ${item.branch_id}.`
          });
        }

        // --- Check stock of all products in the bundle ---
        const [bundleItems] = await db.query(
          `SELECT bi.product_id, bi.quantity AS required_qty, i.stock
           FROM bundle_items bi
           INNER JOIN inventory i
             ON bi.product_id = i.product_id AND i.branch_id = ? AND i.state = 'full'
           WHERE bi.bundle_id = ?`,
          [item.branch_id, bundle.bundle_id]
        );

        for (const bi of bundleItems) {
          const totalRequired = bi.required_qty * item.quantity;
          if (bi.stock < totalRequired) {
            connection.release();
            return res.status(400).json({
              success: false,
              error: `Insufficient stock for product ${bi.product_id} in bundle ${item.branch_bundle_id}. Required: ${totalRequired}, Available: ${bi.stock}`
            });
          }
        }

        branchMap[bundle.branch_id] = branchMap[bundle.branch_id] || [];
        branchMap[bundle.branch_id].push({
          branch_bundle_id: bundle.branch_bundle_id,
          quantity: item.quantity,
          price: bundle.final_price,
          type: "bundle",
          branch_price_at_sale: bundle.branch_price,
          sold_discounted_price: bundle.final_price,
          bundle_items: bundleItems,
        });

      } else {
        connection.release();
        return res.status(400).json({
          success: false,
          error: "Item must include product_id or branch_bundle_id."
        });
      }
    }

    // --- Create pending orders ---
    await connection.beginTransaction();
    const createdOrders = [];

    for (const [branch_id, branchItems] of Object.entries(branchMap)) {
      const totalBranchPrice = branchItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      let delivery_fee = 0;
      if (req.user.role === "users") {
        let [feeRows] = await connection.query(
          `SELECT fee_amount FROM delivery_fees WHERE branch_id = ? AND barangay_id = ? LIMIT 1`,
          [branch_id, barangay_id]
        );
        if (!feeRows.length) {
          [feeRows] = await connection.query(
            `SELECT fee_amount FROM delivery_fees WHERE branch_id = ? AND fee_type = 'outside' LIMIT 1`,
            [branch_id]
          );
        }
        delivery_fee = feeRows[0]?.fee_amount ?? 0;
      }

      const [orderResult] = await connection.query(
        `INSERT INTO orders (
           buyer_id, full_name, contact_number, barangay_id,
           delivery_address, status, total_price, delivery_fee, is_active, ordered_at, inventory_deducted
         ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, 1, NOW(), 0)`,
        [buyer_id, full_name, contact_number, barangay_id, delivery_address, totalBranchPrice, delivery_fee]
      );
      const order_id = orderResult.insertId;

      for (const item of branchItems) {
        await connection.query(
          `INSERT INTO order_items (
             order_id, product_id, branch_bundle_id, quantity, price, type, branch_id, branch_price_at_sale, sold_discounted_price
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order_id,
            item.product_id || null,
            item.branch_bundle_id || null,
            item.quantity,
            item.price,
            item.type,
            branch_id,
            item.branch_price_at_sale,
            item.sold_discounted_price,
          ]
        );
      }

      createdOrders.push({
        order_id,
        branch_id,
        total_price: totalBranchPrice,
        delivery_fee,
        delivery_address,
        status: "pending",
        items: branchItems,
      });
      io.emit("newOrder", createdOrders[createdOrders.length - 1]);
    }

    await connection.commit();
    connection.release();
    return res.status(201).json({ success: true, message: "✅ Orders created successfully.", orders: createdOrders });

  } catch (err) {
    try { await connection.rollback(); connection.release(); } catch (e) {}
    console.error("❌ Error (buy):", err);
    return res.status(500).json({ success: false, error: "Failed to process order." });
  }
});


//Loans
router.post("/loan", authenticateToken, async (req, res) => {
  // --- Role check ---
  if (!["business_owner", "branch_manager"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied.",
    });
  }

  const connection = await db.getConnection();
  try {
    const io = req.app.get("io");
    let { items, full_name, contact_number, barangay_id, delivery_address } = req.body;
    const buyer_id = req.user.id;

    // --- Validate buyer info ---
    if (!full_name || !contact_number || !barangay_id || !delivery_address) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: "Missing required buyer fields.",
      });
    }

    if (!PH_PHONE_REGEX.test(contact_number)) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: "Invalid Philippine contact number format (+639XXXXXXXXX).",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: "No items provided.",
      });
    }

    const barangayRow = await fetchBarangay(barangay_id);
    if (!barangayRow) {
      connection.release();
      return res.status(404).json({
        success: false,
        error: "Barangay not found.",
      });
    }

    // --- Group items by branch ---
    const branchMap = {};

    for (const item of items) {
      if (!item.product_id || !item.branch_id || !item.quantity) {
        connection.release();
        return res.status(400).json({
          success: false,
          error: "Each item must include product_id, branch_id, and quantity.",
        });
      }

      const [rows] = await connection.query(
        `SELECT p.price FROM products p WHERE p.product_id = ? LIMIT 1`,
        [item.product_id]
      );

      const product = rows[0];
      if (!product) {
        connection.release();
        return res.status(400).json({
          success: false,
          error: `Product ${item.product_id} not found.`,
        });
      }

      const basePrice = item.price ?? product.price;

      branchMap[item.branch_id] = branchMap[item.branch_id] || [];
      branchMap[item.branch_id].push({
        product_id: item.product_id,
        quantity: item.quantity,          // ✅ keep positive
        price: -Math.abs(basePrice),      // ✅ NEGATIVE for loan
        type: "loan",
      });
    }

    // --- Transaction ---
    await connection.beginTransaction();
    const createdOrders = [];

    for (const [branch_id, branchItems] of Object.entries(branchMap)) {
      const totalBranchPrice = branchItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );

      // --- Create order ---
      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          buyer_id, full_name, contact_number, barangay_id, delivery_address,
          status, total_price, delivery_fee, is_active, ordered_at, inventory_deducted
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, 0, 1, NOW(), 0)`,
        [
          buyer_id,
          full_name,
          contact_number,
          barangay_id,
          delivery_address,
          totalBranchPrice,
        ]
      );

      const order_id = orderResult.insertId;

      for (const item of branchItems) {
        // --- Insert order item ---
        await connection.query(
          `INSERT INTO order_items
           (order_id, product_id, quantity, price, type, branch_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            order_id,
            item.product_id,
            item.quantity,
            item.price,
            item.type,
            branch_id,
          ]
        );
      }

      createdOrders.push({
        order_id,
        branch_id,
        total_price: totalBranchPrice,
        items: branchItems,
      });

      io.emit("newLoan", {
        order_id,
        branch_id,
        items: branchItems,
      });
    }

    await connection.commit();
    connection.release();

    return res.status(201).json({
      success: true,
      message: "Loan orders created successfully.",
      orders: createdOrders,
    });
  } catch (err) {
    try {
      await connection.rollback();
      connection.release();
    } catch (e) {}

    console.error("❌ Error (loan):", err);
    return res.status(500).json({
      success: false,
      error: "Failed to process loan orders.",
    });
  }
});

router.post("/loan/:loan_id/pay", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { loan_id } = req.params;
    if (!loan_id) {
      console.error("❌ No loan_id provided in request params");
      connection.release();
      return res.status(400).json({ success: false, error: "Loan ID is required" });
    }

    await connection.beginTransaction();

    // --- Get the loan with order_item info and product name ---
    const [loanRows] = await connection.query(
      `SELECT l.*, oi.product_id, oi.quantity, p.product_name
       FROM loans l
       LEFT JOIN order_items oi ON oi.order_items_id = l.order_item_id
       LEFT JOIN products p ON p.product_id = oi.product_id
       WHERE l.loan_id = ? AND l.status = 'pending'
       LIMIT 1`,
      [loan_id]
    );

    const loan = loanRows[0];
    if (!loan) {
      console.error(`❌ Loan not found or already paid (loan_id: ${loan_id})`);
      connection.release();
      return res.status(404).json({ success: false, error: "Loan not found or already paid." });
    }

    // --- Branch manager access check ---
    if (req.user.role === "branch_manager") {
      if (!req.user.branches.includes(loan.branch_id)) {
        console.error(`❌ Branch manager tried to pay loan outside their branch (loan_id: ${loan_id})`);
        connection.release();
        return res.status(403).json({
          success: false,
          error: "You can only pay loans for your own branch",
        });
      }
    }

    // --- Create order with delivered status ---
    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        buyer_id, status, total_price, delivery_fee, is_active, ordered_at, inventory_deducted
      ) VALUES (?, 'delivered', ?, 0, 1, NOW(), 0)`,
      [loan.user_id, loan.price]
    );

    const order_id = orderResult.insertId;

    // --- Insert order_item ---
    await connection.query(
      `INSERT INTO order_items
       (order_id, product_id, quantity, price, type, branch_id)
       VALUES (?, ?, ?, ?, 'loan', ?)`,
      [
        order_id,
        loan.product_id || null,
        loan.quantity || 1,
        loan.price,
        loan.branch_id || null,
      ]
    );

    // --- Get current stock (for logging) ---
    const [stockRows] = await connection.query(
      `SELECT quantity as current_stock FROM order_items WHERE order_items_id = ?`,
      [loan.order_item_id]
    );
    const previous_stock = stockRows[0]?.current_stock || 0;
    const new_stock = previous_stock - (loan.quantity || 1);

    // --- Log inventory as loan_payment with product name ---
    const description = `Loan payment processed for product "${loan.product_name}". Quantity of ${loan.quantity || 1} reconciled.`;

    await connection.query(
      `INSERT INTO inventory_logs
       (product_id, user_id, quantity, previous_stock, new_stock, type, description, created_at)
       VALUES (?, ?, ?, ?, ?, 'loan_payment', ?, NOW())`,
      [
        loan.product_id || null,
        req.user.id,
        loan.quantity || 1,
        previous_stock,
        new_stock,
        description
      ]
    );

    // --- Mark loan as paid ---
    await connection.query(
      `UPDATE loans SET status = 'paid', payed_at = NOW() WHERE loan_id = ?`,
      [loan_id]
    );

    await connection.commit();
    connection.release();

    console.log(`✅ Loan paid successfully (loan_id: ${loan_id})`);
    return res.json({
      success: true,
      message: "Loan paid successfully. Balance reversed.",
    });

  } catch (err) {
    try {
      await connection.rollback();
      connection.release();
    } catch (e) {
      console.error("❌ Rollback failed:", e);
    }
    console.error("❌ Loan payment error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to pay loan.",
    });
  }
});


// USERS/BUYER VIEW: /my-loans
router.get("/my-loans", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const user_id = req.user.id; // use id, not user_id

    const [loans] = await connection.query(
      `SELECT 
          l.loan_id,
          l.order_item_id,
          l.branch_id,
          l.due_date,
          l.status,
          l.created_at,
          l.payed_at,

          oi.order_items_id,
          oi.product_id,
          oi.quantity,
          oi.price,
          oi.type,

          p.product_name,
          p.image_url,

          b.branch_name
       FROM loans l
       INNER JOIN order_items oi ON l.order_item_id = oi.order_items_id
       LEFT JOIN products p ON oi.product_id = p.product_id
       LEFT JOIN branches b ON l.branch_id = b.branch_id
       WHERE l.user_id = ?
       ORDER BY l.due_date ASC`,
      [user_id]
    );

    // Update status to 'overdue' if due_date has passed and status is still pending
    const now = new Date();
    const updatedLoans = loans.map(loan => {
      if (loan.status.toLowerCase() === "pending" && new Date(loan.due_date) < now) {
        loan.status = "overdue";
      }
      return loan;
    });

    connection.release();
    return res.status(200).json({ success: true, loans: updatedLoans });

  } catch (err) {
    try { connection.release(); } catch (e) {}
    console.error("❌ Error (/my-loans):", err);

    return res.status(500).json({
      success: false,
      error: err.sqlMessage || err.message
    });
  }
});

router.get("/branch-loans", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    // Ensure branch_manager has branches
    if (!req.user.branches || req.user.branches.length === 0) {
      return res.status(200).json({ success: true, loans: [] });
    }

    const branchIds = req.user.branches; // array of branch IDs

    const [loans] = await connection.query(
      `SELECT 
          l.loan_id,
          l.order_item_id,
          l.user_id,
          l.branch_id,
          l.due_date,
          l.status,
          l.created_at,
          l.payed_at,

          oi.order_items_id,
          oi.product_id,
          oi.quantity,
          oi.price,
          oi.type,

          p.product_name,
          p.image_url,

          u.name AS user_name,
          u.contact_number AS user_contact,
          b.branch_name
       FROM loans l
       INNER JOIN order_items oi ON l.order_item_id = oi.order_items_id
       LEFT JOIN products p ON oi.product_id = p.product_id
       LEFT JOIN branches b ON l.branch_id = b.branch_id
       LEFT JOIN users u ON l.user_id = u.user_id
       WHERE l.branch_id IN (?)
       ORDER BY l.due_date ASC`,
      [branchIds]
    );

    connection.release();
    return res.status(200).json({ success: true, loans });
  } catch (err) {
    try { connection.release(); } catch (e) {}
    console.error("❌ Error (/branch-loans):", err);

    return res.status(500).json({
      success: false,
      error: err.sqlMessage || err.message
    });
  }
});


// routes/orders.js
router.get(
  "/my-orders",
  authenticateToken,
  requireRole("users", "business_owner", "retailer"),
  async (req, res) => {
    try {
      const buyer_id = req.user.id;

      const [rows] = await db.query(
        `
        SELECT
          o.order_id,
          o.buyer_id,
          o.full_name,
          o.contact_number,
          o.status,
          o.total_price,
          o.delivery_fee,
          o.ordered_at,
          o.delivered_at,
          o.inventory_deducted,

          b.barangay_name AS barangay,
          b.municipality AS municipality,

          oi.product_id,
          p.product_name,
          p.product_description,
          p.image_url AS product_image,

          oi.branch_bundle_id,
          bb.bundle_id,
          bb.branch_id AS bb_branch_id,
          bb.added_at AS bb_added_at,
          bl.bundle_name,
          bl.description AS bundle_description,
          bl.bundle_image,
          oi.quantity,
          oi.price,
          oi.branch_id,
          br.branch_name

        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN branch_bundles bb ON oi.branch_bundle_id = bb.id
        LEFT JOIN bundles bl ON bb.bundle_id = bl.bundle_id
        LEFT JOIN branches br ON oi.branch_id = br.branch_id
        LEFT JOIN barangays b ON o.barangay_id = b.barangay_id
        WHERE o.buyer_id = ?
        ORDER BY o.ordered_at DESC
        `,
        [buyer_id]
      );

      if (!rows.length) {
        return res.status(200).json({ success: true, orders: [] });
      }

      // FORMATTER
      const formatBundleImage = (file) => {
        if (!file) return null;
        return `${process.env.BACKEND_URL || "http://localhost:5000"}/products/bundles/${file}`;
      };

      const formatProductImage = (file) => {
        if (!file) return null;
        return `${process.env.BACKEND_URL || "http://localhost:5000"}/products/images/${file}`;
      };

      const ordersMap = {};

      for (const row of rows) {
        if (!ordersMap[row.order_id]) {
          ordersMap[row.order_id] = {
            order_id: row.order_id,
            buyer_id: row.buyer_id,
            full_name: row.full_name,
            contact_number: row.contact_number,
            status: row.status,
            total_price: row.total_price,
            delivery_fee: row.delivery_fee,
            ordered_at: row.ordered_at,
            delivered_at: row.delivered_at,
            inventory_deducted: row.inventory_deducted,
            barangay: row.barangay,
            municipality: row.municipality,
            items: [],
          };
        }

        if (row.product_id) {
          // PRODUCT
          ordersMap[row.order_id].items.push({
            type: "product",
            product_id: row.product_id,
            product_name: row.product_name,
            product_description: row.product_description,
            image_url: formatProductImage(row.product_image),
            quantity: row.quantity,
            price: row.price,
            branch_id: row.branch_id,
            branch_name: row.branch_name,
          });
        }

        if (row.branch_bundle_id) {
          // BUNDLE
          ordersMap[row.order_id].items.push({
            type: "bundle",
            branch_bundle_id: row.branch_bundle_id,
            bundle_id: row.bundle_id,
            bundle_name: row.bundle_name,
            bundle_description: row.bundle_description,
            image_url: formatBundleImage(row.bundle_image),
            quantity: row.quantity,
            price: row.price, // use price from order_items
            branch_id: row.bb_branch_id,
            branch_name: row.branch_name,
          });
        }
      }

      return res.status(200).json({ success: true, orders: Object.values(ordersMap) });
    } catch (err) {
      console.error("❌ Error fetching my-orders:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch buyer orders." });
    }
  }
);


/* -------------------------------------------------------------------
   RETAILER / SELLER VIEW: /my-sold
   Shows all orders that contain the seller's products
   Includes barangay_name & municipality via barangays JOIN
------------------------------------------------------------------- */
router.get(
  "/my-sold",
  authenticateToken,
  requireRole("retailer", "branch_manager", "admin"),
  async (req, res) => {
    try {
      let query = `
        SELECT
          o.order_id,
          o.buyer_id,
          o.full_name,
          o.contact_number,
          o.status,
          o.total_price,
          o.delivery_fee,
          o.ordered_at,
          o.delivered_at,
          o.inventory_deducted,
          o.delivery_address,

          b.barangay_name AS barangay,
          b.municipality,
          u.name AS buyer_name,
          u.email AS buyer_email,

          oi.order_items_id,
          oi.product_id,
          oi.branch_bundle_id,
          oi.branch_id,
          oi.quantity,
          oi.price AS item_price,
          oi.branch_price_at_sale,
          oi.sold_discounted_price,
          oi.type,

          br.branch_name,

          -- PRODUCT FIELDS
          p.product_name,
          p.product_description,
          p.image_url AS product_image,

          -- BRANCH BUNDLE FIELDS
          bund.bundle_name,
          bund.description AS bundle_description,
          bund.bundle_image
          
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id

        LEFT JOIN products p 
            ON oi.product_id = p.product_id

        LEFT JOIN branch_bundles bb 
            ON oi.branch_bundle_id = bb.id

        LEFT JOIN bundles bund
            ON bb.bundle_id = bund.bundle_id

        LEFT JOIN users u 
            ON o.buyer_id = u.user_id

        LEFT JOIN branches br 
            ON oi.branch_id = br.branch_id

        LEFT JOIN barangays b 
            ON o.barangay_id = b.barangay_id

        WHERE 1
      `;

      const params = [];

      // Filter by branch manager’s branches
      if (
        req.user.role === "branch_manager" &&
        req.user.branches &&
        req.user.branches.length > 0
      ) {
        query += ` AND oi.branch_id IN (${req.user.branches
          .map(() => "?")
          .join(",")})`;
        params.push(...req.user.branches);
      }

      // Filter by retailer’s single branch
      if (req.user.role === "retailer") {
        query += " AND oi.branch_id = ?";
        params.push(req.user.branch_id);
      }

      query += " ORDER BY o.ordered_at DESC";

      const [rows] = await db.query(query, params);

      if (!rows.length)
        return res.status(200).json({ success: true, orders: [] });

      const grouped = rows.reduce((acc, row) => {
        let order = acc.find((o) => o.order_id === row.order_id);

        if (!order) {
          order = {
            order_id: row.order_id,
            buyer_id: row.buyer_id,
            buyer_name: row.buyer_name,
            buyer_email: row.buyer_email,
            full_name: row.full_name,
            contact_number: row.contact_number,
            status: row.status,
            total_price: parseFloat(row.total_price) || 0,
            delivery_fee: parseFloat(row.delivery_fee) || 0,
            ordered_at: row.ordered_at,
            delivered_at: row.delivered_at,
            inventory_deducted: row.inventory_deducted,
            delivery_address: row.delivery_address || null,
            barangay: row.barangay,
            municipality: row.municipality,
            items: [],
          };
          acc.push(order);
        }

        // PRODUCT ITEM
        if (row.product_id) {
          order.items.push({
            type: row.type,  // regular, discounted, refill, loan
            product_id: row.product_id,
            product_name: row.product_name,
            product_description: row.product_description,
            image_url: formatImageUrl(row.product_image, "product"),
            quantity: row.quantity,
            price: parseFloat(row.item_price) || 0,
            branch_price_at_sale: parseFloat(row.branch_price_at_sale) || 0,
            sold_discounted_price: parseFloat(row.sold_discounted_price) || 0,
            branch_id: row.branch_id,
            branch_name: row.branch_name || "Unknown",
          });
        }

        // BUNDLE ITEM
        if (row.branch_bundle_id) {
          order.items.push({
            type: row.type,  // should be 'bundle'
            branch_bundle_id: row.branch_bundle_id,
            bundle_name: row.bundle_name,
            bundle_description: row.bundle_description,
            bundle_image: formatImageUrl(row.bundle_image, "bundle"),
            quantity: row.quantity,
            price: parseFloat(row.item_price) || 0,
            branch_price_at_sale: parseFloat(row.branch_price_at_sale) || 0,
            sold_discounted_price: parseFloat(row.sold_discounted_price) || 0,
            branch_id: row.branch_id,
            branch_name: row.branch_name || "Unknown",
          });
        }

        return acc;
      }, []);

      return res.status(200).json({ success: true, orders: grouped });
    } catch (err) {
      console.error("❌ Error fetching my-sold:", err);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch seller orders." });
    }
  }
);


// Helper function to group orders
function groupOrders(rows, mapItem) {
  const ordersMap = {};

  rows.forEach((row) => {
    if (!ordersMap[row.order_id]) {
      ordersMap[row.order_id] = {
        order_id: row.order_id,
        buyer_id: row.buyer_id,
        full_name: row.full_name,
        contact_number: row.contact_number,
        status: row.status,
        total_price: row.total_price,
        ordered_at: row.ordered_at,
        delivered_at: row.delivered_at,
        inventory_deducted: row.inventory_deducted,
        barangay: row.barangay,
        municipality: row.municipality,
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_email,
        items: [],
      };
    }
    ordersMap[row.order_id].items.push(mapItem(row));
  });

  return Object.values(ordersMap);
}

/* -------------------------------------------------------------------
   BUYER: UPDATE ORDER STATUS (cancel)
------------------------------------------------------------------- */
router.put(
  "/update-status/:id",
  authenticateToken,
  requireRole("users", "business_owner", "retailer"),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user_id = req.user.id;

      const ALLOWED_BUYER_STATUSES = ["cancelled", "delivered", "preparing"];
      if (!ALLOWED_BUYER_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status update." });
      }

      const [rows] = await db.query(
        "SELECT status, inventory_deducted FROM orders WHERE order_id = ? AND buyer_id = ?",
        [id, user_id]
      );

      if (!rows.length) {
        return res.status(403).json({ success: false, error: "Unauthorized or order not found." });
      }

      const currentStatus = rows[0].status;
      const inventoryDeducted = rows[0].inventory_deducted ?? 0;

      if (status === "delivered" && currentStatus !== "on_delivery") {
        return res.status(400).json({ success: false, error: "You can only mark orders as delivered if they are on delivery." });
      }

      if (currentStatus === status) {
        return res.json({ success: false, message: `Order is already marked as ${status}.` });
      }

      await connection.beginTransaction();

      // --------------------------
      // PENDING → PREPARING LOGGING
      // --------------------------
      if (currentStatus === "pending" && status === "preparing") {
        const [items] = await connection.query(
          "SELECT product_id, quantity, type FROM order_items WHERE order_id = ?",
          [id]
        );

        for (const item of items) {
          const [inv] = await connection.query(
            "SELECT stock FROM inventory WHERE product_id = ? AND state = ? LIMIT 1",
            [item.product_id, item.type]
          );

          const previous_stock = inv.length ? inv[0].stock : 0;
          const new_stock = previous_stock; // no deduction

          await connection.query(
            `INSERT INTO inventory_logs 
            (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
            VALUES (?, ?, ?, 'pending_order', ?, ?, ?, ?)`,
            [
              item.product_id,
              item.type,
              user_id,
              item.quantity,
              previous_stock,
              new_stock,
              `Order #${id} moved from pending to preparing`
            ]
          );
        }
      }

      // --------------------------
      // CANCEL → RESTORE INVENTORY
      // --------------------------
      if (status === "cancelled" && inventoryDeducted) {
        const [items] = await connection.query(
          "SELECT product_id, quantity, type FROM order_items WHERE order_id = ?",
          [id]
        );

        for (const item of items) {
          if (item.type === "refill") continue; // skip refill

          await adjustInventory(item.product_id, Number(item.quantity), connection);

          const [inv] = await connection.query(
            "SELECT stock FROM inventory WHERE product_id = ? AND state = ? LIMIT 1",
            [item.product_id, item.type]
          );

          const previous_stock = inv.length ? inv[0].stock - item.quantity : 0;
          const new_stock = previous_stock + item.quantity;

          await connection.query(
            `INSERT INTO inventory_logs
            (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
            VALUES (?, ?, ?, 'order_cancelled', ?, ?, ?, ?)`,
            [
              item.product_id,
              item.type,
              user_id,
              item.quantity,
              previous_stock,
              new_stock,
              `Order #${id} cancelled – stock restored`
            ]
          );
        }

        await connection.query("UPDATE orders SET inventory_deducted = 0 WHERE order_id = ?", [id]);
      }

      // --------------------------
      // DELIVERED → Update delivered_at
      // --------------------------
      if (status === "delivered") {
        await connection.query(
          "UPDATE orders SET status = ?, delivered_at = NOW() WHERE order_id = ?",
          [status, id]
        );
      } else {
        await connection.query(
          "UPDATE orders SET status = ? WHERE order_id = ?",
          [status, id]
        );
      }

      await connection.commit();
      connection.release();

      // --------------------------
      // Emit socket safely
      // --------------------------
      const io = req.app.get("io");
      const BASE_URL = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, "") : "";

      try {
        const [updatedOrderRows] = await db.query(
          `SELECT o.*,
            CONCAT('[', GROUP_CONCAT(
              CONCAT(
                '{"product_id":', oi.product_id,
                ',"product_name":"', REPLACE(p.product_name, '"', '\\"'),
                '","quantity":', oi.quantity,
                ',"price":', oi.price,
                ',"type":"', oi.type,
                '","image_url":"', COALESCE(?, ''), '/', COALESCE(REPLACE(p.image_url, '"', '\\"'), ''),
                '"}'
              )
            ), ']') AS items
          FROM orders o
          JOIN order_items oi ON o.order_id = oi.order_id
          JOIN products p ON oi.product_id = p.product_id
          WHERE o.order_id = ?
          GROUP BY o.order_id`,
          [BASE_URL + "/products/images", id]
        );

        let updatedOrder = updatedOrderRows[0];
        updatedOrder.items = updatedOrder.items ? JSON.parse(updatedOrder.items) : [];

        if (io) io.emit("order-updated", updatedOrder);
      } catch (errEmit) {
        console.error("Socket or updatedOrder fetch error:", errEmit);
      }

      return res.json({
        success: true,
        message:
          status === "cancelled"
            ? "Order cancelled and stock restored."
            : status === "preparing"
            ? "Order moved to preparing."
            : "Order marked as delivered.",
      });

    } catch (err) {
      await connection.rollback();
      connection.release();
      console.error("Server error:", err);
      return res.status(500).json({ success: false, error: "Failed to update order status." });
    }
  }
);

/* -------------------------------------------------------------------
   SELLER: UPDATE ORDER STATUS
------------------------------------------------------------------- */
router.put("/branch/update-status/:id", authenticateToken, requireRole("branch_manager"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = req.user;

  try {
    const ALLOWED_STATUSES = ["pending", "preparing", "on_delivery", "delivered", "cancelled"];
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value." });
    }

    // Check branch ownership
    const [ownershipCheck] = await db.query(
      `SELECT o.order_id, o.status AS current_status, o.inventory_deducted, oi.branch_id
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.order_id = ? AND oi.branch_id = ?
       LIMIT 1`,
      [id, user.branches?.[0]]
    );

    if (!ownershipCheck.length) {
      return res.status(403).json({ success: false, error: "Unauthorized: You do not manage this branch/order." });
    }

    const currentStatus = ownershipCheck[0].current_status;
    const inventoryDeducted = ownershipCheck[0].inventory_deducted ?? 0;

    if (currentStatus === status) {
      return res.json({ success: false, message: `Order is already marked as ${status}.` });
    }

    const statusOrder = ["pending", "preparing", "on_delivery", "delivered"];
    const curIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(status);

    if (status !== "cancelled" && (curIndex === -1 || newIndex !== curIndex + 1)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status transition. Must follow: pending → preparing → on_delivery → delivered",
      });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    // Fetch all order items
    const [items] = await connection.query(
      "SELECT order_items_id, product_id, branch_bundle_id, branch_id, quantity, type, price FROM order_items WHERE order_id = ?",
      [id]
    );

    // --- Inventory deduction: only for preparing → on_delivery ---
    if (currentStatus === "preparing" && status === "on_delivery") {
      const reduceInventory = async (prodId, qty, branchId) => {
        const [fullRows] = await connection.query(
          "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'full'",
          [prodId, branchId]
        );

        if (!fullRows.length) throw new Error(`No full-stock entry found for product ${prodId}.`);
        const fullInv = fullRows[0];
        const prevFullStock = fullInv.stock;

        if (prevFullStock < qty) {
          throw new Error(`Insufficient stock for product ${prodId}. Only ${prevFullStock} left.`);
        }

        await connection.query(
          "UPDATE inventory SET stock = stock - ? WHERE inventory_id = ?",
          [qty, fullInv.inventory_id]
        );
        await connection.query(
          `INSERT INTO inventory_logs
            (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
           VALUES (?, 'full', ?, 'pending_order', ?, ?, ?, ?)`,
          [prodId, user.id, qty, prevFullStock, prevFullStock - qty, `Order #${id} moved stock from full → empty`]
        );

        // Add to empty
        const [emptyRows] = await connection.query(
          "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'empty'",
          [prodId, branchId]
        );

        if (emptyRows.length) {
          const emptyInv = emptyRows[0];
          const prevEmptyStock = emptyInv.stock;
          await connection.query(
            "UPDATE inventory SET stock = stock + ? WHERE inventory_id = ?",
            [qty, emptyInv.inventory_id]
          );
          await connection.query(
            `INSERT INTO inventory_logs
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
             VALUES (?, 'empty', ?, 'pending_order', ?, ?, ?, ?)`,
            [prodId, user.id, qty, prevEmptyStock, prevEmptyStock + qty, `Order #${id} received stock from full → empty`]
          );
        } else {
          const [newEmpty] = await connection.query(
            "INSERT INTO inventory (product_id, branch_id, stock, stock_threshold, state) VALUES (?, ?, ?, NULL, 'empty')",
            [prodId, branchId, qty]
          );
          await connection.query(
            `INSERT INTO inventory_logs
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
             VALUES (?, 'empty', ?, 'pending_order', ?, 0, ?, ?)`,
            [prodId, user.id, qty, qty, `Order #${id} created empty state and added stock`]
          );
        }
      };

      for (const item of items) {
        if (item.type === "refill") continue;

        if (item.branch_bundle_id) {
          const [bundleProducts] = await connection.query(
            `SELECT bi.product_id, bi.quantity AS bundle_quantity
             FROM bundle_items bi
             JOIN branch_bundles bb ON bi.bundle_id = bb.bundle_id
             WHERE bb.id = ?`,
            [item.branch_bundle_id]
          );
          for (const bp of bundleProducts) {
            await reduceInventory(bp.product_id, bp.bundle_quantity * item.quantity, item.branch_id);
          }
        } else {
          await reduceInventory(item.product_id, item.quantity, item.branch_id);
        }
      }

      await connection.query("UPDATE orders SET inventory_deducted = 1 WHERE order_id = ?", [id]);
    }

    // --- Delivered logic ---
    if (status === "delivered") {
      const [orderRows] = await connection.query("SELECT buyer_id FROM orders WHERE order_id = ? LIMIT 1", [id]);
      const buyer_id = orderRows[0].buyer_id;

      for (const item of items) {
        if (item.type === "refill") continue;

        const logInventory = async (prodId, qty, branchId) => {
          const [fullRows] = await connection.query(
            "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'full'",
            [prodId, branchId]
          );
          const prevFullStock = fullRows[0]?.stock ?? 0;

          await connection.query(
            `INSERT INTO inventory_logs
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
             VALUES (?, 'full', ?, 'delivery', ?, ?, ?, ?)`,
            [prodId, user.id, qty, prevFullStock, prevFullStock, `Order delivered #${id}`]
          );
        };

        if (item.branch_bundle_id) {
          const [bundleProducts] = await connection.query(
            `SELECT bi.product_id, bi.quantity AS bundle_quantity
             FROM bundle_items bi
             JOIN branch_bundles bb ON bi.bundle_id = bb.bundle_id
             WHERE bb.id = ?`,
            [item.branch_bundle_id]
          );
          for (const bp of bundleProducts) {
            await logInventory(bp.product_id, bp.bundle_quantity * item.quantity, item.branch_id);
          }
        } else {
          await logInventory(item.product_id, item.quantity, item.branch_id);
        }

        // Loans
        if (["loan", "discounted"].includes(item.type)) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 15);
          const price = item.price ?? 0;

          await connection.query(
            `INSERT INTO loans (order_item_id, user_id, branch_id, due_date, price, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [item.order_items_id, buyer_id, item.branch_id, dueDate, price]
          );
        }
      }

      await connection.query("UPDATE orders SET status = ?, delivered_at = NOW() WHERE order_id = ?", [status, id]);
    } else if (status !== "cancelled") {
      await connection.query("UPDATE orders SET status = ? WHERE order_id = ?", [status, id]);
    }

    // --- Cancelled: restore full & reduce empty ---
    if (status === "cancelled" && inventoryDeducted) {
      const restoreInventory = async (prodId, qty, branchId) => {
        // Restore full
        const [fullRows] = await connection.query(
          "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'full'",
          [prodId, branchId]
        );
        if (fullRows.length) {
          const prevFullStock = fullRows[0].stock;
          await connection.query("UPDATE inventory SET stock = stock + ? WHERE inventory_id = ?", [qty, fullRows[0].inventory_id]);
          await connection.query(
            `INSERT INTO inventory_logs
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
             VALUES (?, 'full', ?, 'order_cancelled', ?, ?, ?, ?)`,
            [prodId, user.id, qty, prevFullStock, prevFullStock + qty, `Stock restored for cancelled Order #${id}`]
          );
        }

        // Reduce empty
        const [emptyRows] = await connection.query(
          "SELECT inventory_id, stock FROM inventory WHERE product_id = ? AND branch_id = ? AND state = 'empty'",
          [prodId, branchId]
        );
        if (emptyRows.length) {
          const emptyInv = emptyRows[0];
          const prevEmptyStock = emptyInv.stock;
          const newEmptyStock = Math.max(prevEmptyStock - qty, 0);
          await connection.query("UPDATE inventory SET stock = ? WHERE inventory_id = ?", [newEmptyStock, emptyInv.inventory_id]);
          await connection.query(
            `INSERT INTO inventory_logs
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
             VALUES (?, 'empty', ?, 'order_cancelled', ?, ?, ?, ?)`,
            [prodId, user.id, qty, prevEmptyStock, newEmptyStock, `Reduced empty stock for cancelled Order #${id}`]
          );
        }
      };

      for (const item of items) {
        if (item.type === "refill") continue;

        if (item.branch_bundle_id) {
          const [bundleProducts] = await connection.query(
            `SELECT bi.product_id, bi.quantity AS bundle_quantity
             FROM bundle_items bi
             JOIN branch_bundles bb ON bi.bundle_id = bb.bundle_id
             WHERE bb.id = ?`,
            [item.branch_bundle_id]
          );
          for (const bp of bundleProducts) {
            await restoreInventory(bp.product_id, bp.bundle_quantity * item.quantity, item.branch_id);
          }
        } else {
          await restoreInventory(item.product_id, item.quantity, item.branch_id);
        }
      }

      await connection.query("UPDATE orders SET inventory_deducted = 0, status = ? WHERE order_id = ?", [status, id]);
    }

    await connection.commit();
    connection.release();
    return res.json({ success: true, message: `Order marked as "${status}" successfully.` });
  } catch (err) {
    console.error("❌ Server error:", err);
    try { await connection.rollback(); connection.release(); } catch (e) {}
    return res.status(500).json({ success: false, error: "Failed to update order status." });
  }
});


router.get("/inventory/logs", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        il.log_id,
        il.product_id,
        p.product_name,
        il.state,
        il.user_id,
        u.name AS user_name,
        il.type,
        il.quantity,
        il.previous_stock,
        il.new_stock,
        il.description,
        il.created_at
      FROM inventory_logs il
      LEFT JOIN users u ON il.user_id = u.user_id
      LEFT JOIN products p ON il.product_id = p.product_id
      ORDER BY il.created_at DESC
    `);

    res.json({ success: true, logs: rows });
  } catch (err) {
    console.error("❌ Failed to fetch inventory logs:", err);
    res.status(500).json({ success: false, error: "Failed to fetch inventory logs" });
  }
});

/* -------------------------------------------------------------------
   UTILITY FUNCTIONS
------------------------------------------------------------------- */


async function adjustInventory(productId, delta, connection) {

  const q = connection ? connection.query.bind(connection) : db.query.bind(db);


  const [rows] = await q("SELECT stock FROM inventory WHERE product_id = ?", [productId]);

  if (!rows.length) {
    throw new Error("Inventory row not found for product and cannot change stock.");
  }

  const current = Number(rows[0].stock);
  const newStock = current + delta;

  if (newStock < 0) {
    throw new Error(`Cannot reduce stock below zero for product_id ${productId}`);
  }

  await q("UPDATE inventory SET stock = ? WHERE product_id = ?", [newStock, productId]);
}
/* -------------------------------------------------------------------
   EXPORT ROUTER
------------------------------------------------------------------- */
module.exports = router;
