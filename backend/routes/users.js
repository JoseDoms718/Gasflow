require('dotenv').config();
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

// ✅ Philippine mobile number regex (+639XXXXXXXXX)
const PH_MOBILE_REGEX = /^\+639\d{9}$/;

// ✅ Helper: Normalize PH number
function normalizePHNumber(number) {
  if (!number) return null;
  number = number.trim();

  if (number.startsWith("0")) {
    number = "+63" + number.slice(1);
  } else if (!number.startsWith("+63")) {
    number = "+63" + number.replace(/^(\+63|0)/, "");
  }

  if (number.length > 13) number = number.slice(0, 13);
  return number;
}


router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { name, email, contact_number, password, role, type, home_address, barangay_id } = req.body;

    // Required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password, and role are required." });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Normalize / validate PH number
    let normalizedContact = null;
    if (contact_number) {
      normalizedContact = normalizePHNumber(contact_number);
      if (!PH_MOBILE_REGEX.test(normalizedContact)) {
        return res.status(400).json({
          error: "Invalid mobile format. Use +639XXXXXXXXX (PH format).",
        });
      }
    }

    // Check duplicate email
    const [existing] = await conn.query("SELECT email FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists." });
    }

    // Validate barangay
    if (barangay_id) {
      const [barangay] = await conn.query(
        "SELECT * FROM barangays WHERE barangay_id = ?",
        [barangay_id]
      );
      if (barangay.length === 0) {
        return res.status(400).json({ error: "Invalid barangay selected." });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userType = type || "pending";

    await conn.beginTransaction();

    // Create user with home_address
    const [result] = await conn.query(
      `INSERT INTO users (name, email, contact_number, password, role, type, home_address, barangay_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, normalizedContact, hashedPassword, role, userType, home_address || null, barangay_id || null]
    );

    const userId = result.insertId;

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      user_id: userId,
    });

  } catch (error) {
    console.error("❌ Error adding user:", error);
    await conn.rollback();
    res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
});


// --------------------
// Fetch all users
// --------------------
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query(
      `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.contact_number,
        u.role,
        u.type,
        u.created_at,
        u.home_address,      -- added this
        u.barangay_id,
        b.barangay_name,
        b.municipality
      FROM users u
      LEFT JOIN barangays b 
        ON u.barangay_id = b.barangay_id
      ORDER BY u.user_id DESC
      `
    );

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/inactive-retailers", async (req, res) => {
  try {
    const [inactiveRetailers] = await db.query(`
      SELECT u.user_id, u.name, u.email
      FROM users u
      WHERE u.role = 'retailer'
        AND u.type = 'active'
        AND EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.buyer_id = u.user_id
            AND o.delivered_at IS NOT NULL
        )
        
        /* 3 months of inactivity condition 
        AND NOT EXISTS (
          SELECT 1
          FROM orders o
          WHERE o.buyer_id = u.user_id
          AND o.delivered_at >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        )
        */

        AND NOT EXISTS (
          SELECT 1
          FROM orders o
          WHERE o.buyer_id = u.user_id
          AND o.delivered_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND)
        )

    `);

    if (inactiveRetailers.length > 0) {
      const ids = inactiveRetailers.map(r => r.user_id);
      await db.query(
        `UPDATE users SET type = 'inactive' WHERE user_id IN (?)`,
        [ids]
      );

      for (const retailer of inactiveRetailers) {
        if (retailer.email) {
          const subject = "⚠️ Your Gasflow Retailer Account Has Been Deactivated";
          const html = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            
            <!-- Header -->
            <div style="background-color: #0047ab; padding: 20px; text-align: center;">
              <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
              <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
            </div>

            <!-- Body -->
            <div style="padding: 30px;">
              <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Hello ${retailer.name},</h2>
              <p style="margin-bottom: 15px;">
                We noticed that your retailer account has had no activity for over <strong>3 months</strong>. 
                As a result, your account has been temporarily <strong>deactivated</strong>.
              </p>
              <p style="margin-bottom: 15px;">
                To reactivate your account, please contact our support team or Admin.
              </p>
              <p style="margin-bottom: 0;">Thank you for being part of Gasflow.</p>
              <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
              &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
            </div>

          </div>
          `;

          try {
            await sendEmail(retailer.email, subject, { html });
          } catch (err) {
            console.error(`❌ Failed to send email to ${retailer.email}:`, err);
          }
        }
      }
    }

    res.json({
      success: true,
      updatedCount: inactiveRetailers.length,
      inactiveRetailers: inactiveRetailers
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch or update inactive retailers" });
  }
});



// ✅ Edit user details
router.put("/:id", async (req, res) => {
  const userId = req.params.id;
  const fields = req.body;

  const allowed = ["name", "email", "contact_number", "barangay_id", "role", "type", "password", "home_address"];
  const updates = {};

  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    // Hash password if updating
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // Normalize contact number if present
    if (updates.contact_number) {
      updates.contact_number = normalizePHNumber(updates.contact_number);
      if (!PH_MOBILE_REGEX.test(updates.contact_number)) {
        return res
          .status(400)
          .json({ error: "Invalid mobile format. Use +639XXXXXXXXX (PH format)" });
      }
    }

    // Validate barangay_id if present
    if (updates.barangay_id) {
      const [barangayExists] = await db.query(
        "SELECT * FROM barangays WHERE barangay_id = ?",
        [updates.barangay_id]
      );
      if (barangayExists.length === 0) {
        return res.status(400).json({ error: "Invalid barangay selected" });
      }
    }

    // Dynamic query builder
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);

    const sql = `UPDATE users SET ${setClause} WHERE user_id = ?`;
    const [result] = await db.query(sql, [...values, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Fetch updated user to get email and name
    const [updatedUserRows] = await db.query(
      "SELECT name, email, type FROM users WHERE user_id = ?",
      [userId]
    );
    const updatedUser = updatedUserRows[0];

    // Send email if type changed
    if (updates.type && updatedUser.email) {
      let subject, html;

      if (updates.type === "inactive") {
        subject = "⚠️ Your Gasflow Account Has Been Deactivated";
        html = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            
            <!-- Header -->
            <div style="background-color: #0047ab; padding: 20px; text-align: center;">
              <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
              <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
            </div>

            <!-- Body -->
            <div style="padding: 30px;">
              <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Hello ${updatedUser.name},</h2>
              <p style="margin-bottom: 15px;">
                Your account has been temporarily <strong>deactivated</strong>.
              </p>
              <p style="margin-bottom: 15px;">
                To reactivate your account, please contact our support team or Admin.
              </p>
              <p style="margin-bottom: 0;">Thank you for being part of Gasflow.</p>
              <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
              &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
            </div>

          </div>
        `;
      } else if (updates.type === "active") {
        subject = "✅ Your Gasflow Account Has Been Activated";
        html = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            
            <!-- Header -->
            <div style="background-color: #0047ab; padding: 20px; text-align: center;">
              <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
              <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
            </div>

            <!-- Body -->
            <div style="padding: 30px;">
              <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Hello ${updatedUser.name},</h2>
              <p style="margin-bottom: 15px;">
                Your account has been <strong>activated</strong> and you can now access Gasflow services.
              </p>
              <p style="margin-bottom: 0;">Welcome back!</p>
              <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
              &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
            </div>

          </div>
        `;
      }

      try {
        await sendEmail(updatedUser.email, subject, { html });
      } catch (err) {
        console.error(`❌ Failed to send email to ${updatedUser.email}:`, err);
      }
    }

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// ✅ Change user password
router.put("/:id/password", async (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await db.query("UPDATE users SET password = ? WHERE user_id = ?", [
      hashedPassword,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("❌ Error updating password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
