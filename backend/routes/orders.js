
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

const formatImageUrl = (fileName) =>
  fileName ? `${process.env.BASE_URL}/products/images/${fileName}` : null;

// Role check middleware (preserves your existing style)
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
  try {
    let {
      items, // array of { product_id, quantity, refill? }
      full_name,
      customer_name,
      contact_number,
      barangay_id,
      address,
      total_price,
    } = req.body;

    const buyerName = full_name || customer_name || "Unknown Customer";

    // Ensure items array
    if (!Array.isArray(items)) items = [];

    if (!items.length || !contact_number) {
      return res.status(400).json({ success: false, error: "Missing required fields." });
    }

    // Parse barangay_id from address if missing
    if (!barangay_id && address) {
      const maybeBarangay = address.split(",")[0].trim();
      if (maybeBarangay) {
        const [rows] = await db.query(
          `SELECT barangay_id FROM barangays WHERE LOWER(barangay_name) = LOWER(?) LIMIT 1`,
          [maybeBarangay]
        );
        if (rows.length) barangay_id = rows[0].barangay_id;
      }
    }

    if (!barangay_id) {
      return res.status(400).json({ success: false, error: "Barangay is required." });
    }

    // Validate barangay exists
    const [barangayRows] = await db.query(
      "SELECT barangay_name, municipality FROM barangays WHERE barangay_id = ? LIMIT 1",
      [barangay_id]
    );
    if (!barangayRows.length) {
      return res.status(404).json({ success: false, error: "Barangay not found." });
    }
    const barangayRow = barangayRows[0];

    // Validate PH contact number
    if (!PH_PHONE_REGEX.test(contact_number)) {
      return res.status(400).json({ success: false, error: "Invalid Philippine contact number format (+639XXXXXXXXX)." });
    }

    // Determine branch_id for branch_manager or retailer
    let branchIdForItems = null;
    if (req.user.role === "branch_manager") branchIdForItems = req.user.branches?.[0] ?? null;
    else if (req.user.role === "retailer") branchIdForItems = req.user.branch_id;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Fetch all products
      const productIds = items.map((it) => it.product_id);
      const [prodRows] = await connection.query(
        `SELECT p.product_id, p.product_name, p.product_type, p.price, p.discounted_price, p.refill_price, i.stock
         FROM products p
         LEFT JOIN inventory i ON p.product_id = i.product_id
         WHERE p.product_id IN (?)`,
        [productIds]
      );

      const productsMap = Object.fromEntries(prodRows.map((p) => [p.product_id, p]));

      // Check stock
      for (const it of items) {
        const product = productsMap[it.product_id];
        if (!product) throw new Error(`Product ${it.product_id} not found.`);
        if (Number(it.quantity) > Number(product.stock)) {
          throw new Error(`Insufficient stock for ${product.product_name}. Only ${product.stock} left.`);
        }
      }

      // Compute total price if not provided
      if (!total_price) {
        total_price = items.reduce((acc, it) => {
          const p = productsMap[it.product_id];
          const price = it.refill && p.refill_price ? p.refill_price : p.discounted_price ?? p.price ?? 0;
          return acc + price * Number(it.quantity);
        }, 0);
      }

      // Insert order
      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          buyer_id, full_name, contact_number, barangay_id,
          status, total_price, is_active, ordered_at, delivered_at, inventory_deducted
        ) VALUES (NULL, ?, ?, ?, 'delivered', ?, 1, NOW(), NOW(), 1)`,
        [buyerName, contact_number, barangay_id, total_price]
      );
      const order_id = orderResult.insertId;

      // Insert items, deduct inventory, and log
      for (const it of items) {
        const prod = productsMap[it.product_id];

        const price = it.refill && prod.refill_price ? prod.refill_price : prod.discounted_price ?? prod.price ?? 0;

        // ✅ Determine type and state for inventory_logs
        let typeForLog, stateForLog;
        if (it.refill && prod.refill_price) {
          typeForLog = "refill";
          stateForLog = "n/a";
        } else {
          typeForLog = "sales";
          stateForLog = "full";
        }

        // Insert order item
        await connection.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price, branch_id) VALUES (?, ?, ?, ?, ?)",
          [order_id, it.product_id, it.quantity, price, branchIdForItems]
        );

        // Deduct inventory
        const prevStock = Number(prod.stock ?? 0);
        const newStock = prevStock - Number(it.quantity);
        await connection.query(
          "UPDATE inventory SET stock = ?, updated_at = NOW() WHERE product_id = ?",
          [newStock, it.product_id]
        );

        // Log inventory
        await connection.query(
          `INSERT INTO inventory_logs 
            (product_id, state, user_id, type, quantity, previous_stock, new_stock, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [it.product_id, stateForLog, req.user.id, typeForLog, it.quantity, prevStock, newStock, `Walk-in sale Order #${order_id}`]
        );
      }

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: "✅ Walk-in order created and marked as delivered!",
        order: {
          order_id,
          items,
          total_price,
          full_name: buyerName,
          contact_number,
          barangay: barangayRow.barangay_name,
          municipality: barangayRow.municipality,
          status: "delivered",
          branch_id: branchIdForItems,
        },
      });
    } catch (txErr) {
      await connection.rollback();
      connection.release();
      console.error("Transaction error (walk-in):", txErr);
      return res.status(500).json({ success: false, error: txErr.message || "Transaction failed." });
    }
  } catch (err) {
    console.error("Server error (walk-in):", err);
    return res.status(500).json({ success: false, error: err.message || "Server error." });
  }
});


//buy endoint
router.post("/buy", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const io = req.app.get("io"); // Socket.IO instance
    let { items, full_name, contact_number, barangay_id } = req.body;
    const buyer_id = req.user.id;

    // Validate buyer info
    if (!full_name || !contact_number || !barangay_id) {
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

    // Validate all items
    const orderItems = items.filter(i => i.product_id && i.quantity && i.type && i.branch_id);
    if (orderItems.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, error: "Invalid items provided. Each item must include branch_id." });
    }

    const barangayRow = await fetchBarangay(barangay_id);
    if (!barangayRow) {
      connection.release();
      return res.status(404).json({ success: false, error: "Barangay not found." });
    }

    // Group items by branch
    const branchMap = {};

    for (const item of orderItems) {
      const sql = `
        SELECT p.product_id,
               bpp.price AS branch_price,
               bpp.discounted_price AS branch_discounted_price,
               bpp.refill_price AS branch_refill_price,
               i.stock,
               i.branch_id
        FROM products p
        INNER JOIN inventory i ON p.product_id = i.product_id
        INNER JOIN branch_product_prices bpp 
            ON p.product_id = bpp.product_id AND i.branch_id = bpp.branch_id
        WHERE p.product_id = ? AND i.branch_id = ? AND i.stock >= ?
        LIMIT 1
      `;
      const [rows] = await db.query(sql, [item.product_id, item.branch_id, item.quantity]);
      const product = rows[0];

      if (!product) {
        connection.release();
        return res.status(400).json({
          success: false,
          error: `Insufficient stock or product ${item.product_id} not available in the selected branch.`,
        });
      }

      // Use branch-specific prices
      const finalPrice =
        item.type === "refill"
          ? product.branch_refill_price ?? 0
          : item.type === "discounted" && product.branch_discounted_price != null
          ? product.branch_discounted_price
          : product.branch_price;

      if (!branchMap[product.branch_id]) branchMap[product.branch_id] = [];
      branchMap[product.branch_id].push({
        product_id: product.product_id,
        quantity: item.quantity,
        price: finalPrice,
        type: item.type,
      });
    }

    await connection.beginTransaction();
    const createdOrders = [];

    for (const [branch_id, branchItems] of Object.entries(branchMap)) {
      const totalBranchPrice = branchItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          buyer_id, full_name, contact_number, barangay_id,
          status, total_price, is_active, ordered_at, inventory_deducted
        ) VALUES (?, ?, ?, ?, 'pending', ?, 1, NOW(), 0)`,
        [buyer_id, full_name, contact_number, barangay_id, totalBranchPrice]
      );

      const order_id = orderResult.insertId;

      for (const item of branchItems) {
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price, type, branch_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [order_id, item.product_id, item.quantity, item.price, item.type, branch_id]
        );

        // Deduct stock
        await connection.query(
          `UPDATE inventory SET stock = stock - ? WHERE product_id = ? AND branch_id = ?`,
          [item.quantity, item.product_id, branch_id]
        );

        // Emit stock update
        const [inventoryRows] = await connection.query(
          `SELECT stock FROM inventory WHERE product_id = ? AND branch_id = ?`,
          [item.product_id, branch_id]
        );
        const updatedStock = inventoryRows[0]?.stock ?? 0;
        io.emit("stock-updated", { product_id: item.product_id, branch_id, stock: updatedStock });
      }

      const newOrder = {
        order_id,
        branch_id,
        total_price: totalBranchPrice,
        status: "pending",
        items: branchItems,
      };

      createdOrders.push(newOrder);
      io.emit("newOrder", newOrder);
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
          o.ordered_at,
          o.delivered_at,
          o.inventory_deducted,
          b.barangay_name AS barangay,
          b.municipality AS municipality,
          oi.product_id,
          p.product_name,
          p.product_description,
          p.image_url AS image_url,
          oi.quantity,
          oi.price,
          oi.branch_id,
          br.branch_name
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.product_id
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

      // Group items by order_id and branch_id to avoid duplicates
      const grouped = groupOrders(rows, (row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        product_description: row.product_description,
        image_url: formatImageUrl(row.image_url),
        quantity: row.quantity,
        price: row.price,
        branch_id: row.branch_id,
        branch_name: row.branch_name,
      }));

      return res.status(200).json({ success: true, orders: grouped });
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
          o.ordered_at,
          o.delivered_at,
          o.inventory_deducted,
          b.barangay_name AS barangay,
          b.municipality AS municipality,
          u.name AS buyer_name,
          u.email AS buyer_email,
          oi.product_id,
          p.product_name,
          p.product_description,
          p.image_url AS image_url,
          oi.quantity,
          oi.price,
          oi.branch_id,
          br.branch_name
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN users u ON o.buyer_id = u.user_id
        LEFT JOIN branches br ON oi.branch_id = br.branch_id
        LEFT JOIN barangays b ON o.barangay_id = b.barangay_id
        WHERE o.status = 'delivered'
      `;

      const params = [];

      // Branch manager: filter by all assigned branches
      if (req.user.role === "branch_manager" && req.user.branches && req.user.branches.length > 0) {
        query += ` AND oi.branch_id IN (${req.user.branches.map(() => "?").join(",")})`;
        params.push(...req.user.branches);
      }

      // Retailer: filter by their user_id (if needed)
      if (req.user.role === "retailer") {
        query += " AND oi.branch_id = ?";
        params.push(req.user.branch_id); // make sure branch_id is set for retailer
      }

      query += " ORDER BY o.delivered_at DESC";

      const [rows] = await db.query(query, params);

      if (!rows.length) return res.status(200).json({ success: true, orders: [] });

      // Group items by order
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
            total_price: row.total_price,
            ordered_at: row.ordered_at,
            delivered_at: row.delivered_at,
            inventory_deducted: row.inventory_deducted,
            barangay: row.barangay,
            municipality: row.municipality,
            items: [],
          };
          acc.push(order);
        }

        order.items.push({
          product_id: row.product_id,
          product_name: row.product_name,
          product_description: row.product_description,
          image_url: formatImageUrl(row.image_url),
          quantity: row.quantity,
          price: row.price,
          branch_id: row.branch_id,
          branch_name: row.branch_name || "Unknown",
        });

        return acc;
      }, []);

      return res.status(200).json({ success: true, orders: grouped });
    } catch (err) {
      console.error("❌ Error fetching my-sold:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch seller orders." });
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
   RETAILER DASHBOARD: /retailer-orders
------------------------------------------------------------------- */
router.get(
  "/branch-orders",
  authenticateToken,
  requireRole("retailer", "branch_manager"),
  async (req, res) => {
    try {
      const user = req.user;

      // STEP 1: Resolve branch_id based on user ownership
      const [branchRows] = await db.query(
        `SELECT branch_id FROM branches WHERE user_id = ? LIMIT 1`,
        [user.id]
      );

      if (branchRows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "User does not belong to any branch.",
        });
      }

      const branch_id = branchRows[0].branch_id;

      // STEP 2: Fetch orders belonging to this branch
      const [rows] = await db.query(
        `
        SELECT
          o.order_id,
          o.full_name,
          o.contact_number,
          o.status,
          o.total_price,
          o.ordered_at,
          o.delivered_at,
          o.inventory_deducted,
          b.barangay_name AS barangay,
          b.municipality AS municipality,
          oi.quantity,
          oi.price,
          oi.branch_id AS item_branch_id,
          p.product_id,
          p.product_name,
          p.product_description,
          p.image_url,
          COALESCE(u.name, o.full_name) AS buyer_name,
          u.email AS buyer_email

        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN users u ON o.buyer_id = u.user_id
        LEFT JOIN barangays b ON o.barangay_id = b.barangay_id
        WHERE oi.branch_id = ?
        ORDER BY o.ordered_at DESC
      `,
        [branch_id]
      );

      // Format images
      const rowsWithImages = rows.map((row) => ({
        ...row,
        image_url: row.image_url ? formatImageUrl(row.image_url) : null,
      }));

      // Group items by order
      const grouped = groupOrders(rowsWithImages, (row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        product_description: row.product_description,
        image_url: row.image_url,
        quantity: row.quantity,
        price: row.price,
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_email,
      }));

      return res.status(200).json({ success: true, orders: grouped });
    } catch (err) {
      console.error("❌ Error fetching branch-orders:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch branch orders.",
      });
    }
  }
);


/* -------------------------------------------------------------------
   BUYER: UPDATE ORDER STATUS (cancel)
------------------------------------------------------------------- */
router.put(
  "/update-status/:id",
  authenticateToken,
  requireRole("users", "business_owner", "retailer"),
  async (req, res) => {
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

      const connection = await db.getConnection();
      try {
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
            const new_stock = previous_stock; // pending → preparing does NOT deduct stock

            await connection.query(
              `INSERT INTO inventory_logs 
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
              VALUES (?, ?, ?, 'pending_order', ?, ?, ?, ?)`,
              [
                item.product_id,
                item.type, // 'full' or 'refill'
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
            // Skip refill if inventory was not deducted
            if (item.type === "refill") continue;

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
                item.type, // 'full' or 'refill'
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
        // Emit socket event
        // --------------------------
        const io = req.app.get("io");
        const [updatedOrderRows] = await db.query(
          `SELECT o.*,
            CONCAT('[', GROUP_CONCAT(
              CONCAT(
                '{"product_id":', oi.product_id,
                ',"product_name":"', REPLACE(p.product_name, '"', '\\"'),
                '","quantity":', oi.quantity,
                ',"price":', oi.price,
                ',"type":"', oi.type,
                '","image_url":"', ?, '/', REPLACE(p.image_url, '"', '\\"'),
                '"}'
              )
            ), ']') AS items
          FROM orders o
          JOIN order_items oi ON o.order_id = oi.order_id
          JOIN products p ON oi.product_id = p.product_id
          WHERE o.order_id = ?
          GROUP BY o.order_id`,
          [process.env.BASE_URL + "products/images", id]
        );

        let updatedOrder = updatedOrderRows[0];
        updatedOrder.items = updatedOrder.items ? JSON.parse(updatedOrder.items) : [];

        if (io) io.emit("order-updated", updatedOrder);

        return res.json({
          success: true,
          message:
            status === "cancelled"
              ? "Order cancelled and stock restored."
              : status === "preparing"
              ? "Order moved to preparing."
              : "Order marked as delivered.",
        });
      } catch (errTx) {
        await connection.rollback();
        connection.release();
        console.error("TX error:", errTx);
        return res.status(500).json({ success: false, error: "Failed to update order." });
      }
    } catch (err) {
      console.error("Server error:", err);
      return res.status(500).json({ success: false, error: "Failed to update order status." });
    }
  }
);


/* -------------------------------------------------------------------
   SELLER: UPDATE ORDER STATUS
------------------------------------------------------------------- */
router.put(
  "/branch/update-status/:id",
  authenticateToken,
  requireRole("branch_manager"),
  async (req, res) => {
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
        [id, user.branches?.[0]] // branch_manager may have multiple branches
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

      const [items] = await connection.query(
        "SELECT product_id, quantity, type FROM order_items WHERE order_id = ?",
        [id]
      );

      // STOCK DEDUCTION (pending → preparing or preparing → on_delivery)
      if (
        (currentStatus === "pending" && status === "preparing") ||
        (currentStatus === "preparing" && status === "on_delivery")
      ) {
        for (const item of items) {
          if (item.type === "refill") continue;

          const [invRows] = await connection.query(
            "SELECT stock FROM inventory WHERE product_id = ?",
            [item.product_id]
          );
          const prev = invRows[0]?.stock ?? 0;
          let newStock = prev;

          if (currentStatus === "preparing" && status === "on_delivery" && !inventoryDeducted) {
            if (prev < item.quantity) {
              await connection.rollback();
              connection.release();
              return res.status(400).json({
                success: false,
                error: `Insufficient stock for product_id ${item.product_id}. Only ${prev} left.`,
              });
            }
            await adjustInventory(item.product_id, -item.quantity, connection);
            newStock = prev - item.quantity;

            await connection.query("UPDATE orders SET inventory_deducted = 1 WHERE order_id = ?", [id]);
          }

          await connection.query(
            `INSERT INTO inventory_logs
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
             VALUES (?, 'full', ?, 'pending_order', ?, ?, ?, ?)`,
            [item.product_id, user.id, item.quantity, prev, newStock, `Order #${id} moved from ${currentStatus} → ${status}`]
          );
        }
      }

      // DELIVERED
      if (status === "delivered") {
        for (const item of items) {
          if (item.type === "refill") continue;
          const [invRows] = await connection.query(
            "SELECT stock FROM inventory WHERE product_id = ?",
            [item.product_id]
          );
          const prev = invRows[0]?.stock ?? 0;

          await connection.query(
            `INSERT INTO inventory_logs
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
             VALUES (?, 'full', ?, 'delivery', ?, ?, ?, ?)`,
            [item.product_id, user.id, item.quantity, prev, prev, `Order delivered #${id}`]
          );
        }
        await connection.query("UPDATE orders SET status = ?, delivered_at = NOW() WHERE order_id = ?", [status, id]);
      } else {
        await connection.query("UPDATE orders SET status = ? WHERE order_id = ?", [status, id]);
      }

      // CANCELLED
      if (status === "cancelled" && inventoryDeducted) {
        for (const item of items) {
          if (item.type === "refill") continue;
          const [invRows] = await connection.query(
            "SELECT stock FROM inventory WHERE product_id = ?",
            [item.product_id]
          );
          const prev = invRows[0]?.stock ?? 0;

          await adjustInventory(item.product_id, item.quantity, connection);

          await connection.query(
            `INSERT INTO inventory_logs
              (product_id, state, user_id, type, quantity, previous_stock, new_stock, description)
             VALUES (?, 'full', ?, 'order_cancelled', ?, ?, ?, ?)`,
            [item.product_id, user.id, item.quantity, prev, prev + item.quantity, `Stock restored for cancelled Order #${id}`]
          );
        }
        await connection.query("UPDATE orders SET inventory_deducted = 0 WHERE order_id = ?", [id]);
      }

      await connection.commit();
      connection.release();

      return res.json({ success: true, message: `Order marked as "${status}" successfully.` });
    } catch (err) {
      console.error("❌ Server error:", err);
      return res.status(500).json({ success: false, error: "Failed to update order status." });
    }
  }
);



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
