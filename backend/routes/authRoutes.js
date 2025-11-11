const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");

const router = express.Router();

// Standard invalid login response
const invalidLoginResponse = {
  success: false,
  error: "Invalid email or password",
};

// DB error helper
const handleDbError = (res, err, msg) => {
  console.error(`❌ ${msg}:`, err);
  return res.status(500).json({ success: false, error: "Database error" });
};

// Admin-only route guard
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, error: "Forbidden: Admins only." });
  }
  next();
};

// 🔐 LOGIN ROUTE
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Email and password are required." });
  }

  try {
    // Fetch user + barangay info
    const [userData] = await db.query(
      `
      SELECT u.user_id, u.name, u.email, u.role, u.type, u.password, u.contact_number,
             u.barangay_id, b.barangay_name, b.municipality
      FROM users u
      LEFT JOIN barangays b ON u.barangay_id = b.barangay_id
      WHERE u.email = ?
    `,
      [email]
    );

    if (userData.length === 0) return res.status(401).json(invalidLoginResponse);

    const user = userData[0];

    // Check if account is active
    if (user.type.toLowerCase() !== "active") {
      return res.status(403).json({
        success: false,
        error:
          user.type === "pending"
            ? "Your account is still pending approval or email verification."
            : "Your account is inactive. Please contact support.",
      });
    }

    // Password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json(invalidLoginResponse);

    // Generate JWT including barangay info
    const token = jwt.sign(
      {
        id: user.user_id,
        role: user.role,
        name: user.name,
        municipality: user.municipality,
        barangay: user.barangay_name,
        contact_number: user.contact_number,
      },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      message: "Login successful.",
      token,
      userId: user.user_id,
      name: user.name,
      role: user.role,
      municipality: user.municipality,
      barangay: user.barangay_name,
      contact_number: user.contact_number,
      type: user.type,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 👤 CURRENT USER INFO
// 👤 CURRENT USER INFO
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [results] = await db.query(
      `
      SELECT u.user_id, u.name, u.email, u.contact_number, u.role, u.type,
             u.barangay_id,  -- include the ID
             b.barangay_name AS barangay,
             b.municipality
      FROM users u
      LEFT JOIN barangays b ON u.barangay_id = b.barangay_id
      WHERE u.user_id = ?
    `,
      [req.user.id]
    );

    if (results.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Return the barangay_id as well so frontend can select the correct dropdown option
    res.json({ success: true, user: results[0] });
  } catch (err) {
    handleDbError(res, err, "Error fetching user info");
  }
});

module.exports = router;
