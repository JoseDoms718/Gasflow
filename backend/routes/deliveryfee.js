require("dotenv").config();
const express = require("express");
const db = require("../config/db");

const router = express.Router();

// --------------------------------------
// Add or update delivery fees for a branch
// --------------------------------------
router.post("/set", async (req, res) => {
  const { branch_id, fees, near_fee, far_fee, outside_fee } = req.body;

  if (!branch_id) {
    return res.status(400).json({ error: "branch_id is required." });
  }

  if (!fees || !Array.isArray(fees)) {
    return res.status(400).json({ error: "fees array is required." });
  }

  if (near_fee == null || far_fee == null || outside_fee == null) {
    return res.status(400).json({ error: "near_fee, far_fee, and outside_fee are required." });
  }

  try {
    // 1️⃣ Get branch municipality
    const [branchRows] = await db.query(`SELECT * FROM branches WHERE branch_id = ?`, [branch_id]);
    if (branchRows.length === 0) {
      return res.status(404).json({ error: "Branch not found." });
    }
    const branchMunicipality = branchRows[0].municipality;

    // 2️⃣ Insert/update provided barangay fees
    for (const fee of fees) {
      const { barangay_id, type } = fee;

      if (!["free", "near", "far", "outside"].includes(type)) {
        return res.status(400).json({ error: `Invalid fee type: ${type}` });
      }

      const [existing] = await db.query(
        `SELECT * FROM delivery_fees WHERE branch_id = ? AND barangay_id = ?`,
        [branch_id, barangay_id || null]
      );

      const feeAmount = type === "near" ? near_fee : type === "far" ? far_fee : type === "outside" ? outside_fee : 0;

      if (existing.length > 0) {
        await db.query(
          `UPDATE delivery_fees SET fee_type = ?, fee_amount = ? WHERE branch_id = ? AND barangay_id = ?`,
          [type, feeAmount, branch_id, barangay_id || null]
        );
      } else {
        await db.query(
          `INSERT INTO delivery_fees (branch_id, barangay_id, fee_type, fee_amount) VALUES (?, ?, ?, ?)`,
          [branch_id, barangay_id || null, type, feeAmount]
        );
      }
    }

    // 3️⃣ Auto-add outside fees for all barangays not in the branch's municipality
    const [allBarangays] = await db.query(`SELECT barangay_id, municipality FROM barangays`);
    for (const b of allBarangays) {
      if (b.municipality !== branchMunicipality) {
        const [existing] = await db.query(
          `SELECT * FROM delivery_fees WHERE branch_id = ? AND barangay_id = ?`,
          [branch_id, b.barangay_id]
        );
        if (existing.length === 0) {
          await db.query(
            `INSERT INTO delivery_fees (branch_id, barangay_id, fee_type, fee_amount) VALUES (?, ?, ?, ?)`,
            [branch_id, b.barangay_id, "outside", outside_fee]
          );
        }
      }
    }

    res.status(200).json({ success: true, message: "Delivery fees updated successfully, including outside fees." });
  } catch (error) {
    console.error("❌ Error setting delivery fees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
