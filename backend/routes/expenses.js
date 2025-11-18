require('dotenv').config();
const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");

const router = express.Router();

/* -----------------------------------------
   🧰 Helpers
----------------------------------------- */
const handleDbError = (res, err, msg) => {
  console.error(`❌ ${msg}:`, err);
  return res.status(500).json({ success: false, error: "Database error" });
};

const validateExpenseInput = (details, cost, res) => {
  if (!details || !cost) {
    res.status(400).json({ success: false, error: "Missing expense details or cost." });
    return false;
  }
  return true;
};

const notFoundResponse = (res, message = "Expense not found.") =>
  res.status(404).json({ success: false, error: message });

/* -----------------------------------------
   🧩 Role-based query builder
----------------------------------------- */
function getExpenseQueryByRole(role, userId) {
  const BASE_SELECT = `
    SELECT 
      e.expense_id,
      e.expenses_details,
      e.expenses_cost,
      e.created_at,
      e.municipality,
      u.name AS user_name
    FROM expenses e
    LEFT JOIN users u ON e.added_by = u.user_id
  `;

  // ADMIN — sees all expenses
  if (role === "admin") {
    return {
      sql: `${BASE_SELECT} ORDER BY e.created_at DESC`,
      params: []
    };
  }

  // RETAILER / BUSINESS OWNER — sees only their own expenses
  if (role === "retailer" || role === "business_owner") {
    return {
      sql: `${BASE_SELECT} WHERE e.added_by = ? ORDER BY e.created_at DESC`,
      params: [userId]
    };
  }

  return null;
}


// Reusable DB helper
const queryDB = (sql, params = []) => db.query(sql, params);

/* -----------------------------------------
   ✅ ADD EXPENSE
----------------------------------------- */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { expenses_details, expenses_cost } = req.body;
    if (!validateExpenseInput(expenses_details, expenses_cost, res)) return;

    const sql = `
      INSERT INTO expenses (user_id, expenses_details, expenses_cost, created_at)
      VALUES (?, ?, ?, NOW())
    `;

    const [result] = await queryDB(sql, [req.user.id, expenses_details, expenses_cost]);
    res.status(201).json({
      success: true,
      message: "Expense added successfully.",
      expense_id: result.insertId,
    });
  } catch (err) {
    handleDbError(res, err, "Error inserting expense");
  }
});

/* -----------------------------------------
   ✅ GET ALL EXPENSES (Role-Based)
----------------------------------------- */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        e.expense_id,
        e.expenses_details,
        e.expenses_cost,
        e.created_at,
        u.name AS user_name,
        b.municipality
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.user_id
      LEFT JOIN barangays b ON u.barangay_id = b.barangay_id
      ORDER BY e.created_at DESC
    `;

    const [rows] = await db.query(sql);

    res.json({
      success: true,
      expenses: rows,
    });
  } catch (err) {
    console.error("❌ SQL ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Database error",
      details: err.message,
    });
  }
});


/* -----------------------------------------
   ✅ GET SINGLE EXPENSE
----------------------------------------- */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const queryData = getExpenseQueryByRole(req.user.role, req.user.id, req.params.id);
    if (!queryData)
      return res.status(403).json({ success: false, error: "Unauthorized role. Access denied." });

    const [results] = await queryDB(queryData.sql, queryData.params);
    if (results.length === 0) return notFoundResponse(res);

    res.status(200).json({ success: true, expense: results[0] });
  } catch (err) {
    handleDbError(res, err, "Error fetching expense");
  }
});

/* -----------------------------------------
   ✅ UPDATE EXPENSE
----------------------------------------- */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { expenses_details, expenses_cost } = req.body;
    if (!validateExpenseInput(expenses_details, expenses_cost, res)) return;

    const sql = `
      UPDATE expenses
      SET expenses_details = ?, expenses_cost = ?
      WHERE expense_id = ? AND user_id = ?
    `;

    const [result] = await queryDB(sql, [
      expenses_details,
      expenses_cost,
      req.params.id,
      req.user.id,
    ]);

    if (result.affectedRows === 0)
      return notFoundResponse(res, "Expense not found or unauthorized to edit.");

    res.status(200).json({ success: true, message: "Expense updated successfully." });
  } catch (err) {
    handleDbError(res, err, "Error updating expense");
  }
});

/* -----------------------------------------
   ✅ DELETE EXPENSE
----------------------------------------- */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const sql = `DELETE FROM expenses WHERE expense_id = ? AND user_id = ?`;
    const [result] = await queryDB(sql, [req.params.id, req.user.id]);

    if (result.affectedRows === 0)
      return notFoundResponse(res, "Expense not found or unauthorized to delete.");

    res.status(200).json({ success: true, message: "Expense deleted successfully." });
  } catch (err) {
    handleDbError(res, err, "Error deleting expense");
  }
});

module.exports = router;
