// middleware/authtoken.js
const jwt = require("jsonwebtoken");

/**
 * ✅ Middleware: Verify JWT token and attach normalized user info to req.user
 */
function authenticateToken(req, res, next) {
  try {
    // ✅ Extract token from Authorization header
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No token provided. Authorization denied.",
      });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret"
    );

    // ✅ Normalize decoded user info so req.user.id always exists
    req.user = {
    id: decoded.user_id || decoded.id,
    role: decoded.role,
    name: decoded.name,
    municipality: decoded.municipality,
    barangay_id: decoded.barangay_id, // <-- ADD THIS
  };

    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);

    // Handle specific JWT errors for better UX
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Session expired. Please log in again.",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token. Please log in again.",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Authentication failed. Please log in again.",
    });
  }
}

module.exports = authenticateToken;
