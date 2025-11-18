require('dotenv').config();
const express = require("express");
const db = require("../config/db"); // your existing db connection
const router = express.Router();

// GET /barangays?municipality=Boac
router.get("/", async (req, res) => {
  try {
    const { municipality } = req.query; // read query param
    let query = `
      SELECT barangay_id AS id, barangay_name AS name, municipality
      FROM barangays
    `;
    const params = [];

    if (municipality) {
      query += ` WHERE municipality = ?`;
      params.push(municipality);
    }

    query += ` ORDER BY barangay_name`;

    const [barangays] = await db.query(query, params);
    res.json(barangays);
  } catch (err) {
    console.error("❌ Error fetching barangays:", err);
    res.status(500).json({ error: "Failed to load barangays" });
  }
});

module.exports = router;
