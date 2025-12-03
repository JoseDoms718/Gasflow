require("dotenv").config();
const express = require("express");
const db = require("../config/db");

const router = express.Router();

// -------------------------
// Set/add delivery fees
// -------------------------
router.post("/set", async (req, res) => {
  const { branch_id, fees, near_fee, far_fee, outside_fee } = req.body;

  if (!branch_id) return res.status(400).json({ error: "branch_id is required." });
  if (!fees || !Array.isArray(fees)) return res.status(400).json({ error: "fees array is required." });
  if (near_fee == null || far_fee == null || outside_fee == null)
    return res.status(400).json({ error: "near_fee, far_fee, and outside_fee are required." });

  try {
    // 1️⃣ Get branch and its municipality
    const [branchRows] = await db.query(
      `SELECT branch_id, branch_name, barangay_id FROM branches WHERE branch_id = ?`,
      [branch_id]
    );
    if (branchRows.length === 0) return res.status(404).json({ error: "Branch not found." });

    const branch = branchRows[0];

    // 2️⃣ Insert/update provided barangay fees
    for (const fee of fees) {
      const { barangay_id, type } = fee;

      if (!["free", "near", "far", "outside"].includes(type))
        return res.status(400).json({ error: `Invalid fee type: ${type}` });

      const [existing] = await db.query(
        `SELECT * FROM delivery_fees WHERE branch_id = ? AND barangay_id ${barangay_id ? "= ?" : "IS NULL"}`,
        barangay_id ? [branch_id, barangay_id] : [branch_id]
      );

      const feeAmount =
        type === "near" ? near_fee :
        type === "far" ? far_fee :
        type === "outside" ? outside_fee : 0;

      if (existing.length > 0) {
        await db.query(
          `UPDATE delivery_fees SET fee_type = ?, fee_amount = ? WHERE branch_id = ? AND barangay_id ${barangay_id ? "= ?" : "IS NULL"}`,
          barangay_id ? [type, feeAmount, branch_id, barangay_id] : [type, feeAmount, branch_id]
        );
      } else {
        await db.query(
          `INSERT INTO delivery_fees (branch_id, barangay_id, fee_type, fee_amount) VALUES (?, ?, ?, ?)`,
          [branch_id, barangay_id || null, type, feeAmount]
        );
      }
    }

    // 3️⃣ Auto-add "outside" fees for barangays not in the branch's barangay municipality
    const [allBarangays] = await db.query(`SELECT barangay_id, municipality FROM barangays`);
    const branchBarangay = branch.barangay_id ? await db.query(`SELECT municipality FROM barangays WHERE barangay_id = ?`, [branch.barangay_id]) : null;
    const branchMunicipality = branchBarangay && branchBarangay[0].length ? branchBarangay[0][0].municipality : null;

    for (const b of allBarangays) {
      if (branchMunicipality && b.municipality !== branchMunicipality) {
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

// -------------------------
// Get delivery fees by branch
// -------------------------
router.get("/get/:branch_id", async (req, res) => {
  const { branch_id } = req.params;
  try {
    const [fees] = await db.query(
      `SELECT df.*, b.barangay_name AS barangay_name, b.municipality 
       FROM delivery_fees df 
       LEFT JOIN barangays b ON df.barangay_id = b.barangay_id 
       WHERE df.branch_id = ?`,
      [branch_id]
    );
    res.status(200).json({ success: true, fees });
  } catch (error) {
    console.error("❌ Error fetching delivery fees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.patch("/update", async (req, res) => {
  const { branch_id, barangay_id, fee_type, fee_amount } = req.body;

  if (!branch_id) return res.status(400).json({ error: "branch_id is required." });
  if (!["free", "near", "far", "outside"].includes(fee_type))
    return res.status(400).json({ error: "Invalid fee_type." });
  if (fee_amount == null) return res.status(400).json({ error: "fee_amount is required." });

  try {
    // Check if the fee exists
    const [existing] = await db.query(
      `SELECT * FROM delivery_fees WHERE branch_id = ? AND barangay_id ${barangay_id ? "= ?" : "IS NULL"}`,
      barangay_id ? [branch_id, barangay_id] : [branch_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Delivery fee not found for this branch/barangay." });
    }

    // Update the fee
    await db.query(
      `UPDATE delivery_fees SET fee_type = ?, fee_amount = ? WHERE branch_id = ? AND barangay_id ${barangay_id ? "= ?" : "IS NULL"}`,
      barangay_id ? [fee_type, fee_amount, branch_id, barangay_id] : [fee_type, fee_amount, branch_id]
    );

    res.status(200).json({ success: true, message: "Delivery fee updated successfully." });
  } catch (error) {
    console.error("❌ Error updating delivery fee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
