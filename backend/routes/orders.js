
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
   Update order status helper
-------------------------------------------- */
async function updateOrderStatus(orderId, status) {
  const query =
    status === "delivered"
      ? "UPDATE orders SET status = ?, delivered_at = NOW() WHERE order_id = ?"
      : "UPDATE orders SET status = ?, delivered_at = NULL WHERE order_id = ?";
  await db.query(query, [status, orderId]);
}

/* -------------------------------------------
   Inventory adjust helper (supports transaction connection)
   delta can be positive (restore) or negative (deduct).
   If no inventory row exists and delta > 0 -> INSERT.
   If no row exists and delta < 0 -> throw error.
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
   Fetch product info joined with inventory
   (keeps previous behavior: returns inventory_stock & stock_threshold)
-------------------------------------------- */
async function fetchProductWithInventory(product_id) {
  const [rows] = await db.query(
    `SELECT p.*, i.stock AS inventory_stock, i.stock_threshold
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.product_id
     WHERE p.product_id = ?`,
    [product_id]
  );
  return rows[0];
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
    // Accept either single product fields or an array `items`/`products`.
    // Prefer normalized `items` array: [{ product_id, quantity, price? }]
    let {
      items, // array of { product_id, quantity }
      product_id,
      quantity,
      product_name,
      full_name,
      customer_name,
      contact_number,
      barangay_id,
      address,
      total_price,
    } = req.body;

    const buyerName = full_name || customer_name || "Unknown Customer";

    // If single-product shorthand used
    if (!Array.isArray(items)) {
      if (product_id && quantity) {
        items = [{ product_id, quantity }];
      } else {
        items = [];
      }
    }

    // Try to parse barangay_id from address if missing (address like "Brgy X, Municipality")
    if (!barangay_id && address) {
      // NOTE: this is a best-effort attempt; prefer to send barangay_id from frontend
      const [maybeBarangay] = address.split(",").map((s) => s.trim());
      if (maybeBarangay) {
        // Look up barangay by name (case-insensitive)
        const [rows] = await db.query(
          `SELECT barangay_id FROM barangays WHERE LOWER(barangay_name) = LOWER(?) LIMIT 1`,
          [maybeBarangay]
        );
        if (rows.length) barangay_id = rows[0].barangay_id;
      }
    }

    if (!items.length || !contact_number || !barangay_id) {
      return res.status(400).json({ success: false, error: "Missing required fields." });
    }

    // Validate barangay exists
    const barangayRow = await fetchBarangay(barangay_id);
    if (!barangayRow) {
      return res.status(404).json({ success: false, error: "Barangay not found." });
    }

    if (!PH_PHONE_REGEX.test(contact_number)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Philippine contact number format (+639XXXXXXXXX).",
      });
    }

    for (const it of items) {
      const product = await fetchProductWithInventory(it.product_id);
      if (!product) {
        return res.status(404).json({ success: false, error: `Product ${it.product_id} not found.` });
      }
      const available = Number(product.inventory_stock ?? 0);
      if (available < Number(it.quantity)) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.product_name}. Only ${available} left.`,
        });
      }
    }

    // Compute total if not provided
    let computedTotal = total_price;
    if (!computedTotal) {
      computedTotal = items.reduce((sum, it) => {
        return sum;
      }, 0);

      computedTotal = 0;
      for (const it of items) {
        const p = await fetchProductWithInventory(it.product_id);
        const price = p.discounted_price ?? p.price ?? 0;
        computedTotal += price * Number(it.quantity);
      }
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.query(
        `
        INSERT INTO orders (
          buyer_id, full_name, contact_number, barangay_id,
          status, total_price, is_active, ordered_at, delivered_at, inventory_deducted
        ) VALUES (NULL, ?, ?, ?, 'delivered', ?, 1, NOW(), NOW(), 1)
      `,
        [buyerName, contact_number, barangay_id, computedTotal]
      );

      const order_id = orderResult.insertId;

      for (const it of items) {
        // fetch price for each item to record
        const [prodRows] = await connection.query(
          `SELECT discounted_price, price FROM products WHERE product_id = ? LIMIT 1`,
          [it.product_id]
        );
        const prod = prodRows[0];
        const price = prod ? prod.discounted_price ?? prod.price ?? 0 : 0;

        await connection.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [order_id, it.product_id, it.quantity, price]
        );

        // deduct inventory using connection helper
        await adjustInventory(it.product_id, -Number(it.quantity), connection);
      }

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: "✅ Walk-in order created and marked as delivered!",
        order: {
          order_id,
          items,
          total_price: computedTotal,
          full_name: buyerName,
          contact_number,
          barangay: barangayRow.barangay_name,
          municipality: barangayRow.municipality,
          status: "delivered",
        },
      });
    } catch (errTx) {
      await connection.rollback();
      connection.release();
      console.error("Transaction error (walk-in):", errTx);
      if (
        errTx.message &&
        errTx.message.includes("Inventory row not found for product and cannot decrement stock")
      ) {
        return res.status(400).json({
          success: false,
          error: "Insufficient stock or inventory record missing for this product.",
        });
      }
      return res.status(500).json({ success: false, error: "Transaction failed." });
    }
  } catch (err) {
    console.error("Server error (walk-in):", err);
    return res.status(500).json({ success: false, error: "Server error." });
  }
});


router.post("/buy", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const io = req.app.get("io"); // get Socket.IO instance

    let { items, product_id, quantity, full_name, contact_number, barangay_id } = req.body;
    const buyer_id = req.user.id;

    // Single-product shortcut
    if (!items && product_id && quantity) {
      // default type to regular if not specified
      items = [{ product_id, quantity, type: "regular" }];
    }

    // Validate buyer info
    if (!full_name || !contact_number || !barangay_id) {
      connection.release();
      return res.status(400).json({ success: false, error: "Missing required buyer fields." });
    }

    if (!PH_PHONE_REGEX.test(contact_number)) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: "Invalid Philippine contact number format (+639XXXXXXXXX).",
      });
    }

    // Normalize items input
    const orderItems = Array.isArray(items)
      ? items.filter((i) => i.product_id && i.quantity && i.type)
      : [];

    if (orderItems.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, error: "No valid items provided." });
    }

    // Validate barangay exists
    const barangayRow = await fetchBarangay(barangay_id);
    if (!barangayRow) {
      connection.release();
      return res.status(404).json({ success: false, error: "Barangay not found." });
    }

    // Fetch products + inventory, group by seller
    const productsMap = {};
    

    for (const item of orderItems) {
      const sql = `
        SELECT p.product_id, p.product_name, p.product_description, p.price, p.discounted_price, p.refill_price,
               p.seller_id, p.image_url, i.stock
        FROM products p
        LEFT JOIN inventory i ON p.product_id = i.product_id
        WHERE p.product_id = ?
      `;
      const [rows] = await db.query(sql, [item.product_id]);
      const product = rows[0];

      if (!product) {
        connection.release();
        return res.status(404).json({ success: false, error: `Product ${item.product_id} not found.` });
      }

      const availableStock = Number(product.stock ?? 0);
      if (availableStock < Number(item.quantity)) {
        connection.release();
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.product_name}. Only ${availableStock} left.`,
        });
      }

      const seller_id = product.seller_id;

      // Choose price based on type
      const price =
        item.type === "refill"
          ? product.refill_price
          : product.discounted_price ?? product.price;

      const subtotal = price * item.quantity;

      if (!productsMap[seller_id]) productsMap[seller_id] = [];

      const imageUrl = product.image_url
        ? product.image_url.startsWith("http")
          ? product.image_url
          : `${process.env.BASE_URL}/${product.image_url.replace(/^\/+/, "")}`
        : null;

      productsMap[seller_id].push({
        seller_id,
        product_id: product.product_id,
        product_name: product.product_name,
        product_description: product.product_description,
        image_url: imageUrl,
        quantity: item.quantity,
        type: item.type,
        price,
        subtotal,
      });
    }

    // Begin transaction
    await connection.beginTransaction();
    const createdOrders = [];

    for (const [seller_id, sellerItems] of Object.entries(productsMap)) {
      const totalSellerPrice = sellerItems.reduce((sum, i) => sum + i.subtotal, 0);

      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          buyer_id, full_name, contact_number, barangay_id,
          status, total_price, is_active, ordered_at, inventory_deducted
        ) VALUES (?, ?, ?, ?, 'pending', ?, 1, NOW(), 0)`,
        [buyer_id, full_name, contact_number, barangay_id, totalSellerPrice]
      );

      const order_id = orderResult.insertId;

      // Insert items with type and price
      for (const item of sellerItems) {
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price, type) VALUES (?, ?, ?, ?, ?)`,
          [order_id, item.product_id, item.quantity, item.price, item.type]
        );
      }

      const orderObj = {
        order_id,
        seller_id,
        total_price: totalSellerPrice,
        status: "pending",
        items: sellerItems.map(({ product_id, product_name, product_description, image_url, quantity, price, subtotal, type }) => ({
          product_id,
          product_name,
          product_description,
          image_url: image_url || `${process.env.BASE_URL}/placeholder.png`,
          quantity,
          type,
          price,
          subtotal,
        })),
      };

      createdOrders.push(orderObj);

      // Emit real-time order event
      io.emit("newOrder", orderObj);
    }

    await connection.commit();
    connection.release();

    return res.status(201).json({
      success: true,
      message: "✅ Orders created successfully.",
      orders: createdOrders,
    });
  } catch (err) {
    try { await connection.rollback(); connection.release(); } catch (e) {}
    console.error("❌ Error (buy):", err);
    return res.status(500).json({ success: false, error: "Failed to process order." });
  }
});

// routes/orders.js

router.get("/my-orders", authenticateToken, requireRole("users", "business_owner", "retailer"), async (req, res) => {
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
        p.product_id,
        p.product_name,
        p.product_description,
        p.image_url AS image_url,
        oi.quantity,
        oi.price,
        u.name AS seller_name
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.product_id
      LEFT JOIN users u ON p.seller_id = u.user_id
      LEFT JOIN barangays b ON o.barangay_id = b.barangay_id
      WHERE o.buyer_id = ?
      ORDER BY o.ordered_at DESC
      `,
      [buyer_id]
    );

    if (!rows.length) {
      return res.status(200).json({ success: true, orders: [] });
    }

    const grouped = groupOrders(rows, (row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    product_description: row.product_description,
    image_url: formatImageUrl(row.image_url),
    quantity: row.quantity,
    price: row.price,
    seller_name: row.seller_name,
  }));


    return res.status(200).json({ success: true, orders: grouped });
  } catch (err) {
    console.error("❌ Error fetching my-orders:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch buyer orders." });
  }
});

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
          p.product_id,
          p.product_name,
          p.product_description,
          p.image_url AS image_url,
          oi.quantity,
          oi.price,
          COALESCE(s.name, 'N/A') AS seller_name
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN users u ON o.buyer_id = u.user_id
        LEFT JOIN users s ON p.seller_id = s.user_id
        LEFT JOIN barangays b ON o.barangay_id = b.barangay_id
      `;

      let params = [];

      if (req.user.role === "admin") {
        // Admin: show only delivered orders where the product seller is a branch manager
        query += " WHERE o.status = 'delivered' AND s.role = 'branch_manager'";
      } else {
        // Regular seller/branch_manager: show only their delivered orders
        query += " WHERE o.status = 'delivered' AND p.seller_id = ?";
        params.push(req.user.id);
      }

      query += " ORDER BY o.delivered_at DESC";

      const [rows] = await db.query(query, params);

      if (!rows.length) {
        return res.status(200).json({ success: true, orders: [] });
      }

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
          seller_name: row.seller_name,
        });

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
   RETAILER DASHBOARD: /retailer-orders
------------------------------------------------------------------- */
router.get(
  "/retailer-orders",
  authenticateToken,
  requireRole("retailer", "branch_manager"),
  async (req, res) => {
    try {
      const seller_id = req.user.id;

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
          p.product_id,
          p.product_name,
          p.product_description,
          p.image_url AS image_url,
          COALESCE(u.name, o.full_name) AS buyer_name,
          u.email AS buyer_email
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN users u ON o.buyer_id = u.user_id
        LEFT JOIN barangays b ON o.barangay_id = b.barangay_id
        WHERE p.seller_id = ?
        ORDER BY o.ordered_at DESC
      `,
        [seller_id]
      );

      // ALWAYS format image URLs before grouping
      const rowsWithImages = rows.map((row) => ({
        ...row,
        image_url: row.image_url ? formatImageUrl(row.image_url) : null,
      }));

      const grouped = groupOrders(rowsWithImages, (row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        product_description: row.product_description,
        image_url: row.image_url, // already formatted
        quantity: row.quantity,
        price: row.price,
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_email,
      }));

      return res.status(200).json({ success: true, orders: grouped });
    } catch (err) {
      console.error("❌ Error fetching retailer-orders:", err);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch retailer orders." });
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

      // Allowed buyer-side statuses
      const ALLOWED_BUYER_STATUSES = ["cancelled", "delivered"];
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

      // Only allow marking 'on_delivery' → 'delivered'
      if (status === "delivered" && currentStatus !== "on_delivery") {
        return res.status(400).json({ success: false, error: "You can only mark orders as delivered if they are on delivery." });
      }

      if (currentStatus === status) {
        return res.json({ success: false, message: `Order is already marked as ${status}.` });
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // Cancel order: restore inventory if deducted
        if (status === "cancelled" && inventoryDeducted) {
          const [items] = await connection.query(
            "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
            [id]
          );
          for (const item of items) {
            await adjustInventory(item.product_id, Number(item.quantity), connection);
          }
          await connection.query("UPDATE orders SET inventory_deducted = 0 WHERE order_id = ?", [id]);
        }

        // Update status in DB
        await updateOrderStatus(id, status, connection);

        await connection.commit();
        connection.release();

        // Emit Socket.IO event
        const io = req.app.get("io");
        const [updatedOrderRows] = await db.query(
          `SELECT o.*,
            CONCAT('[', GROUP_CONCAT(
              CONCAT(
                '{"product_id":', oi.product_id,
                ',"product_name":"', REPLACE(p.product_name, '"', '\\"'),
                '","quantity":', oi.quantity,
                ',"price":', oi.price,
                ',"image_url":"', ?, '/', REPLACE(p.image_url, '"', '\\"'),
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
              ? "✅ Order cancelled and stock restored (if previously deducted)."
              : "✅ Order marked as delivered successfully.",
        });
      } catch (errTx) {
        await connection.rollback();
        connection.release();
        console.error("Transaction error (update-status buyer):", errTx);
        return res.status(500).json({ success: false, error: "Failed to update order." });
      }
    } catch (err) {
      console.error("Server error (update-status):", err);
      return res.status(500).json({ success: false, error: "Failed to update order status." });
    }
  }
);

/* -------------------------------------------------------------------
   SELLER: UPDATE ORDER STATUS
------------------------------------------------------------------- */
router.put(
  "/retailer/update-status/:id",
  authenticateToken,
  requireRole("retailer", "branch_manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { id: user_id } = req.user;

      console.log("📝 Incoming update request:", { order_id: id, status, user_id });

      if (!ALLOWED_SELLER_STATUSES.includes(status)) {
        console.warn("⚠️ Invalid status:", status);
        return res.status(400).json({ success: false, error: "Invalid status value." });
      }

      // Ensure seller owns at least one item in the order
      const [ownershipCheck] = await db.query(
        `
        SELECT o.order_id, o.status AS current_status, o.inventory_deducted
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE o.order_id = ? AND p.seller_id = ?
        LIMIT 1
        `,
        [id, user_id]
      );

      console.log("Ownership check result:", ownershipCheck);

      if (!ownershipCheck.length) {
        console.warn("🚫 Unauthorized access attempt to order:", id);
        return res
          .status(403)
          .json({ success: false, error: "Unauthorized: You do not own this order." });
      }

      const currentStatus = ownershipCheck[0].current_status;
      const inventoryDeducted = ownershipCheck[0].inventory_deducted ?? 0;

      console.log("Current status:", currentStatus, "Inventory deducted:", inventoryDeducted);

      if (currentStatus === status) {
        console.info("ℹ️ Order already in target status:", status);
        return res.json({ success: false, message: `Order is already marked as ${status}.` });
      }

      const statusOrder = ["pending", "preparing", "on_delivery", "delivered"];
      const curIndex = statusOrder.indexOf(currentStatus);
      const newIndex = statusOrder.indexOf(status);

      if (status !== "cancelled") {
        if (curIndex === -1 || newIndex !== curIndex + 1) {
          console.warn("⚠️ Invalid status transition attempted:", { currentStatus, status });
          return res.status(400).json({
            success: false,
            error: `Invalid status transition. Must follow: pending -> preparing -> on_delivery -> delivered`,
          });
        }
      }

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        console.log("🔄 Transaction started for order:", id);

        // Transition TO 'preparing' => deduct inventory
        if (status === "preparing" && !inventoryDeducted) {
          console.log("⏳ Deducting inventory for order:", id);

          const [items] = await connection.query(
            "SELECT product_id, quantity, type FROM order_items WHERE order_id = ?",
            [id]
          );

          if (!items.length) {
            console.error("❌ No items found for order:", id);
            await connection.rollback();
            connection.release();
            return res.status(404).json({ success: false, error: "No items found for this order." });
          }

          // Only consider non-refill items for stock deduction
          const stockItems = items.filter((i) => i.type !== "refill");

          const productIds = stockItems.map((it) => it.product_id);
          if (productIds.length) {
            const placeholders = productIds.map(() => "?").join(",");
            const [inventoryRows] = await connection.query(
              `SELECT product_id, stock FROM inventory WHERE product_id IN (${placeholders})`,
              productIds
            );

            const inventoryMap = {};
            for (const r of inventoryRows) inventoryMap[r.product_id] = Number(r.stock);

            for (const item of stockItems) {
              const avail = inventoryMap[item.product_id] ?? 0;
              if (avail < Number(item.quantity)) {
                console.error("❌ Insufficient stock for product:", item.product_id);
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                  success: false,
                  error: `Insufficient stock for product_id ${item.product_id}. Only ${avail} left.`,
                });
              }
            }

            for (const item of stockItems) {
              console.log("➖ Deducting", item.quantity, "from product", item.product_id);
              await adjustInventory(item.product_id, -Number(item.quantity), connection);
            }

            await connection.query("UPDATE orders SET inventory_deducted = 1 WHERE order_id = ?", [id]);
            console.log("✅ Inventory deducted for order:", id);
          } else {
            console.log("ℹ️ No non-refill items to deduct for this order");
          }
        }


        // Transition TO cancelled from 'preparing' => restore stock
        if (status === "cancelled" && currentStatus === "preparing" && inventoryDeducted) {
          console.log("🔄 Restoring inventory for cancelled order:", id);

          const [items] = await connection.query(
            "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
            [id]
          );

          for (const item of items) {
            console.log("➕ Restoring", item.quantity, "to product", item.product_id);
            await adjustInventory(item.product_id, Number(item.quantity), connection);
          }

          await connection.query("UPDATE orders SET inventory_deducted = 0 WHERE order_id = ?", [id]);
          console.log("✅ Inventory restored for order:", id);
        }

        // Update order status
        console.log("🔄 Updating order status in DB:", status);
        await updateOrderStatus(id, status, connection);

        await connection.commit();
        connection.release();
        console.log("✅ Transaction committed for order:", id);

        // Emit Socket.IO event
        const io = req.app.get("io");

        const [updatedOrderRows] = await db.query(
          `SELECT o.*,
            CONCAT('[', GROUP_CONCAT(
              CONCAT(
                '{"product_id":', oi.product_id,
                ',"product_name":"', REPLACE(p.product_name, '"', '\\"'),
                '","quantity":', oi.quantity,
                ',"price":', oi.price,
                ',"image_url":"', REPLACE(p.image_url, '"', '\\"'),
                '"}'
              )
            ), ']') AS items
          FROM orders o
          JOIN order_items oi ON o.order_id = oi.order_id
          JOIN products p ON oi.product_id = p.product_id
          WHERE o.order_id = ?
          GROUP BY o.order_id`,
          [id]
        );

        const updatedOrder = updatedOrderRows[0];

        try {
          updatedOrder.items = JSON.parse(updatedOrder.items || "[]");
        } catch (err) {
          console.error("❌ Failed to parse items JSON:", updatedOrder.items, err);
          updatedOrder.items = [];
        }

        if (io) {
          io.emit("order-updated", updatedOrder);
          console.log("📡 Socket.IO event emitted for order:", id);
        } else {
          console.warn("⚠️ Socket.IO not available to emit event.");
        }

        return res.json({
          success: true,
          message: `✅ Order marked as "${status}" successfully.`,
        });
      } catch (errTx) {
        await connection.rollback();
        connection.release();
        console.error("❌ Transaction error (update order status):", errTx);
        return res.status(500).json({ success: false, error: "Failed to update order." });
      }
    } catch (err) {
      console.error("❌ Server error (retailer update-status):", err);
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


async function updateOrderStatus(order_id, status, conn = null) {
  const query = "UPDATE orders SET status = ? WHERE order_id = ?";
  if (conn) {
    await conn.query(query, [status, order_id]);
  } else {
    await db.query(query, [status, order_id]); 
  }
}

/* -------------------------------------------------------------------
   EXPORT ROUTER
------------------------------------------------------------------- */
module.exports = router;
