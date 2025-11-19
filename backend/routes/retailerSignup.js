require('dotenv').config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const multer = require("multer");
const sendEmail = require("../utils/sendEmail")
const path = require("path");
const fs = require("fs");
const authenticateToken = require("../middleware/authtoken");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
// -----------------------------
// Directories
// -----------------------------
const requiredDocsPath = path.join(__dirname, "../uploads/retailer/requiredDocs");
const examResultsPath = path.join(__dirname, "../uploads/retailer/examResults");

// -----------------------------
// Multer setup
// -----------------------------
const storageRequiredDocs = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(requiredDocsPath)) fs.mkdirSync(requiredDocsPath, { recursive: true });
    cb(null, requiredDocsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const uploadRequiredDocs = multer({ storage: storageRequiredDocs });

const storageExamResults = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(examResultsPath)) fs.mkdirSync(examResultsPath, { recursive: true });
    cb(null, examResultsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const uploadExamResult = multer({ storage: storageExamResults });

// -----------------------------
// Retailer Pre-registration
// -----------------------------
router.post("/", uploadRequiredDocs.any(), async (req, res) => {
  try {
    const { name, email, password, contact_number, municipality, barangay } = req.body;

    if (!name || !email || !password || !municipality || !barangay) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [existingPending] = await db.query("SELECT * FROM pending_accounts WHERE email = ?", [email]);
    const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingPending.length > 0 || existingUser.length > 0) {
      return res.status(400).json({ error: "This email is already registered or pending verification." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO pending_accounts 
        (email, name, barangay_id, contact_number, password, role, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [email, name, barangay, contact_number, hashedPassword, "retailer"]
    );

    const pendingId = result.insertId;

    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const relativePath = path.relative(path.join(__dirname, "../"), file.path).replace(/\\/g, "/");
        await db.query("INSERT INTO otp_images (otp_id, type, image_url) VALUES (?, ?, ?)", [pendingId, file.fieldname, relativePath]);
      }
    }

    res.json({ success: true, message: "🎉 Registration info submitted. Please wait for verification." });
  } catch (err) {
    console.error("❌ Retailer pre-registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------
// Approve Retailer
// -----------------------------
router.post("/approve/:pendingId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== "admin")
      return res.status(403).json({ error: "Admins only." });

    const { pendingId } = req.params;

    const [pendingRecords] = await db.query(
      "SELECT * FROM pending_accounts WHERE id = ?",
      [pendingId]
    );
    if (pendingRecords.length === 0)
      return res.status(404).json({ error: "Pending registration not found." });

    const pendingData = pendingRecords[0];

    const [processRecords] = await db.query(
      "SELECT * FROM retailer_process WHERE pending_account_id = ?",
      [pendingId]
    );
    if (processRecords.length === 0)
      return res.status(400).json({ error: "No process found for this pending account." });

    const processData = processRecords[0];

    if (
      processData.process_status !== "completed" ||
      processData.training_result !== "passed" ||
      pendingData.status !== "completed"
    )
      return res.status(400).json({
        error:
          "Cannot approve: Training/exam must be completed and passed, and account must be completed.",
      });

    // Create user account
    await db.query(
      `INSERT INTO users (name, email, contact_number, barangay_id, password, role, type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        pendingData.name,
        pendingData.email,
        pendingData.contact_number,
        pendingData.barangay_id,
        pendingData.password,
        pendingData.role,
        "active",
      ]
    );

    // Delete process row first (important if FK exists)
    await db.query(
      "DELETE FROM retailer_process WHERE pending_account_id = ?",
      [pendingId]
    );

    // Delete pending account
    const [deleteResult] = await db.query(
      "DELETE FROM pending_accounts WHERE id = ?",
      [pendingId]
    );

    if (deleteResult.affectedRows === 0)
      return res.status(500).json({ error: "Failed to delete pending account." });

    // -----------------------------
    // Send Approval Email
    // -----------------------------
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

    await sendEmail(
      pendingData.email,
      "🎉 Gasflow Retailer Approved",
      {
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background-color: #0047ab; padding: 20px; text-align: center;">
            <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
            <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
          </div>

          <!-- Body -->
          <div style="padding: 30px;">
            <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Dear ${pendingData.name},</h2>

            <p style="margin-bottom: 15px;">
              Congratulations! Your Gasflow retailer account has been successfully approved.
            </p>

            <p style="margin-bottom: 15px;">
              You can now log in to your account and start accessing your retailer dashboard:
            </p>

            <p style="margin-bottom: 15px;">
            </p>

            <p style="margin-bottom: 0;">Thank you for being part of Gasflow.</p>
            <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
            &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
          </div>
        </div>
        `,
        attachments: [
          {
            filename: "logoWhite.png",
            path: path.join(__dirname, "../../src/assets/design/LogoWhite.png"),
            cid: "logoWhite",
          },
        ],
      }
    );

    res.json({ success: true, message: "✅ Retailer approved successfully and email sent." });
  } catch (err) {
    console.error("❌ Approve retailer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// -----------------------------
// Initialize Retailer Process
// -----------------------------
router.post("/init-process/:pendingId", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const { pendingId } = req.params;

    const [pendingRecords] = await db.query(
      "SELECT * FROM pending_accounts WHERE id = ?",
      [pendingId]
    );
    if (pendingRecords.length === 0)
      return res.status(404).json({ error: "Pending account not found." });

    const [existingProcess] = await db.query(
      "SELECT * FROM retailer_process WHERE pending_account_id = ?",
      [pendingId]
    );
    if (existingProcess.length > 0)
      return res.status(400).json({ error: "Process already initialized for this account." });

    // Initialize the retailer process
    await db.query(
      `INSERT INTO retailer_process 
       (pending_account_id, process_status, created_at, updated_at) 
       VALUES (?, 'pending', NOW(), NOW())`,
      [pendingId]
    );

    // Update pending account status
    await db.query(
      "UPDATE pending_accounts SET status = 'processing', updated_at = NOW() WHERE id = ?",
      [pendingId]
    );

    // Send email notification
    const data = pendingRecords[0]; // Contains name, email, etc.
    await sendEmail(
      data.email,
      "✅ Gasflow Retailer Requirements Confirmed",
      {
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <!-- Header -->
            <div style="background-color: #0047ab; padding: 20px; text-align: center;">
              <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
              <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
            </div>

            <!-- Body -->
            <div style="padding: 30px;">
              <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Dear ${data.name},</h2>
              <p style="margin-bottom: 15px;">
                We have successfully reviewed and confirmed your submitted requirements for becoming a Gasflow retailer.
              </p>
              <p style="margin-bottom: 15px;">
                Your application process is now officially <strong>in progress</strong>. You will be notified of the next steps once your account has been fully processed.
              </p>
              <p style="margin-bottom: 15px;">
                You can log in to your account to track your application status:
              </p>
              <p style="margin-bottom: 0;">Thank you for submitting your requirements to Gasflow.</p>
              <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
              &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
            </div>
          </div>
        `,
      }
    );

    res.json({ success: true, message: "✅ Retailer process initialized successfully, status updated to 'processing', and email sent." });
  } catch (err) {
    console.error("❌ Initialize retailer process error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------
// Update Training Result
// -----------------------------
router.put("/training-result/:processId", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Admins only." });
    }

    const { processId } = req.params;
    const { result } = req.body; // "passed" or "failed"

    if (!result || !["passed", "failed"].includes(result)) {
      return res.status(400).json({ error: "Invalid training result. Must be 'passed' or 'failed'." });
    }

    // Fetch process
    const [processRows] = await db.query("SELECT * FROM retailer_process WHERE id = ?", [processId]);
    if (processRows.length === 0) return res.status(404).json({ error: "Process not found." });

    const process = processRows[0];
    const pendingId = process.pending_account_id;

    // Update training result and process status
    await db.query(
      `UPDATE retailer_process 
       SET training_result = ?, process_status = 'completed', updated_at = NOW() 
       WHERE id = ?`,
      [result, processId]
    );

    await db.query(
      "UPDATE pending_accounts SET status = 'completed', updated_at = NOW() WHERE id = ?",
      [pendingId]
    );

    // Fetch retailer info for email
    const [retailerRows] = await db.query(
      `SELECT r.*, pa.name, pa.email 
       FROM retailer_process r
       JOIN pending_accounts pa ON pa.id = r.pending_account_id
       WHERE r.id = ?`,
      [processId]
    );

    if (!retailerRows.length) {
      return res.status(404).json({ error: "Retailer not found." });
    }

    const retailer = retailerRows[0];

    // Determine message based on training result
    const trainingMessage = result === "passed"
      ? "✅ You passed the training! Please wait for confirmation."
      : "❌ You did not pass the training. Please review and try again.";

    // Send email
    await sendEmail(
      retailer.email,
      "🏆 Gasflow Training Result",
      {
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background-color: #0047ab; padding: 20px; text-align: center;">
            <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
            <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
          </div>

          <!-- Body -->
          <div style="padding: 30px;">
            <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Dear ${retailer.name},</h2>

            <p style="margin-bottom: 15px;">
              Your training results have been processed. Please find the summary below:
            </p>

            <ul style="margin-bottom: 15px; padding-left: 20px;">
              <li><strong>Training Result:</strong> ${result.toUpperCase()}</li>
            </ul>

            <p style="margin-bottom: 15px;">
              ${trainingMessage}
            </p>

            <p style="margin-bottom: 15px;">
            </p>

            <p style="margin-bottom: 0;">Thank you for your continued cooperation.</p>
            <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
            &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
          </div>
        </div>
        `,
        attachments: [
          {
            filename: "logoWhite.png",
            path: path.join(__dirname, "../../src/assets/design/LogoWhite.png"),
            cid: "logoWhite",
          },
        ],
      }
    );

    res.json({ success: true, message: `✅ Training result set to '${result}' and process marked as completed. Email sent.` });

  } catch (err) {
    console.error("❌ Update training result error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------
// Reject Retailer
// -----------------------------
router.post("/reject/:pendingId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Admins only." });
    }

    const { pendingId } = req.params;

    // Fetch pending account
    const [pendingRecords] = await db.query(
      "SELECT * FROM pending_accounts WHERE id = ?",
      [pendingId]
    );
    if (pendingRecords.length === 0)
      return res.status(404).json({ error: "Pending registration not found." });

    const data = pendingRecords[0]; // Contains name, email, etc.

    // Delete attached images
    const [images] = await db.query(
      "SELECT * FROM otp_images WHERE otp_id = ?",
      [pendingId]
    );
    for (let img of images) {
      const filePath = path.join(__dirname, "../", img.image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // Delete image records and pending account
    await db.query("DELETE FROM otp_images WHERE otp_id = ?", [pendingId]);
    await db.query("DELETE FROM pending_accounts WHERE id = ?", [pendingId]);

    // Send rejection email
    await sendEmail(
      data.email,
      "❌ Gasflow Retailer Registration Rejected",
      {
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <!-- Header -->
            <div style="background-color: #ab0000; padding: 20px; text-align: center;">
              <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
              <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
            </div>

            <!-- Body -->
            <div style="padding: 30px;">
              <h2 style="color: #ab0000; font-size: 20px; margin-bottom: 15px;">Dear ${data.name},</h2>
              <p style="margin-bottom: 15px;">
                We regret to inform you that your Gasflow retailer registration has been <strong>rejected</strong>.
              </p>
              <p style="margin-bottom: 15px;">
                If you have any questions or need clarification regarding the reason for rejection, please contact our support team.
              </p>
              <p style="margin-bottom: 0;">Thank you for your interest in Gasflow.</p>
              <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
              &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
            </div>
          </div>
        `,
      }
    );

    res.json({ success: true, message: "❌ Retailer registration rejected successfully and email sent." });
  } catch (err) {
    console.error("❌ Reject retailer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// -----------------------------
// Fetch endpoints (cleaned)
// -----------------------------

router.get("/pending-registrations", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") return res.status(403).json({ success: false, error: "Admins only." });

    const [pendingRecords] = await db.query(`
      SELECT p.id, p.name, p.email, p.contact_number, p.role, p.status,
             b.barangay_name AS barangay, b.municipality
      FROM pending_accounts p
      LEFT JOIN barangays b ON p.barangay_id = b.barangay_id
      WHERE p.role = 'retailer' AND p.status = 'verification'
    `);

    for (let record of pendingRecords) {
      const [images] = await db.query("SELECT * FROM otp_images WHERE otp_id = ?", [record.id]);
      record.images = images;
    }

    res.json({ success: true, data: pendingRecords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/pending-processes", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") return res.status(403).json({ success: false, error: "Admins only." });

    const [processRecords] = await db.query(`
      SELECT rp.id AS process_id, rp.process_status, rp.created_at AS process_created,
             p.id AS retailer_id, p.name, p.email, p.contact_number, p.role, p.status,
             b.barangay_name AS barangay, b.municipality
      FROM retailer_process rp
      JOIN pending_accounts p ON rp.pending_account_id = p.id
      LEFT JOIN barangays b ON p.barangay_id = b.barangay_id
      WHERE rp.process_status = 'pending'
    `);

    for (let record of processRecords) {
      const [images] = await db.query("SELECT * FROM otp_images WHERE otp_id = ?", [record.retailer_id]);
      record.images = images;
    }

    res.json({ success: true, data: processRecords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/pending-exams", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") return res.status(403).json({ success: false, error: "Admins only." });

    const [examProcesses] = await db.query(`
      SELECT rp.id AS process_id, rp.process_status, rp.exam_date, rp.exam_time, rp.exam_location, rp.created_at AS process_created,
             p.id AS retailer_id, p.name, p.email, p.contact_number, p.role, p.status,
             b.barangay_name AS barangay, b.municipality
      FROM retailer_process rp
      JOIN pending_accounts p ON rp.pending_account_id = p.id
      LEFT JOIN barangays b ON p.barangay_id = b.barangay_id
      WHERE rp.process_status = 'pending_exam'
    `);

    for (let record of examProcesses) {
      const [images] = await db.query("SELECT * FROM otp_images WHERE otp_id = ?", [record.retailer_id]);
      record.images = images;
    }

    res.json({ success: true, data: examProcesses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------
// Schedule Exam / Training / Upload Exam Result
// -----------------------------
router.put("/schedule-exam/:processId", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin")
      return res.status(403).json({ success: false, error: "Admins only." });

    const { processId } = req.params;
    const { exam_date, exam_time, exam_location } = req.body;

    if (!exam_date || !exam_time || !exam_location)
      return res.status(400).json({
        success: false,
        error: "Exam date, time, and location are required.",
      });

    // Update the retailer process with exam details
    const [result] = await db.query(
      `UPDATE retailer_process 
       SET exam_date = ?, exam_time = ?, exam_location = ?, process_status = 'pending_exam', updated_at = NOW() 
       WHERE id = ?`,
      [exam_date, exam_time, exam_location, processId]
    );

    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, error: "Retailer process not found." });

    // Fetch the retailer info to send email
    const [retailerRows] = await db.query(
      `SELECT r.*, pa.name, pa.email 
       FROM retailer_process r
       JOIN pending_accounts pa ON pa.id = r.pending_account_id
       WHERE r.id = ?`,
      [processId]
    );

    if (retailerRows.length === 0)
      return res
        .status(404)
        .json({ success: false, error: "Retailer not found." });

    const retailer = retailerRows[0];

    // Send exam schedule email
    await sendEmail(
      retailer.email,
      "📝 Gasflow Retailer Exam Scheduled",
      {
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: #0047ab; padding: 20px; text-align: center;">
            <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
            <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
          </div>

          <!-- Body -->
          <div style="padding: 30px;">
            <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Dear ${retailer.name},</h2>
            <p style="margin-bottom: 15px;">
              Your retailer examination has been scheduled successfully. Please find the details below:
            </p>
            <ul style="margin-bottom: 15px; padding-left: 20px;">
              <li><strong>Date:</strong> ${exam_date}</li>
              <li><strong>Time:</strong> ${exam_time}</li>
              <li><strong>Location:</strong> ${exam_location}</li>
            </ul>
            <p style="margin-bottom: 15px;">
              Please make sure to be present on time and bring all the required documents.
            </p>
            <p style="margin-bottom: 15px;">
              You can log in to your account to view your application status:
            </p>
            <p style="margin-bottom: 15px;">
            </p>
            <p style="margin-bottom: 0;">Thank you for being part of Gasflow.</p>
            <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
            &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
          </div>
        </div>
      `,
      }
    );

    res.json({ success: true, message: "Exam scheduled and email sent successfully." });
  } catch (err) {
    console.error("❌ Schedule exam error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


router.put("/schedule-training/:processId", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin")
      return res.status(403).json({ success: false, error: "Admins only." });

    const { processId } = req.params;
    const { training_date, training_time, training_location } = req.body;

    if (!training_date || !training_time || !training_location)
      return res.status(400).json({
        success: false,
        error: "Training date, time, and location are required.",
      });

    // Update DB
    const [result] = await db.query(
      `UPDATE retailer_process 
       SET training_date = ?, training_time = ?, training_location = ?, process_status = 'pending_results', updated_at = NOW()
       WHERE id = ?`,
      [training_date, training_time, training_location, processId]
    );

    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, error: "Retailer process not found." });

    // Fetch retailer info
    const [retailerRows] = await db.query(
      `SELECT r.*, pa.name, pa.email
       FROM retailer_process r
       JOIN pending_accounts pa ON pa.id = r.pending_account_id
       WHERE r.id = ?`,
      [processId]
    );

    if (!retailerRows.length)
      return res
        .status(404)
        .json({ success: false, error: "Retailer not found." });

    const retailer = retailerRows[0];

    // Send training schedule email
    await sendEmail(
      retailer.email,
      "📘 Gasflow Retailer Training Schedule",
      {
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background-color: #0047ab; padding: 20px; text-align: center;">
            <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
            <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
          </div>

          <!-- Body -->
          <div style="padding: 30px;">
            <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Dear ${retailer.name},</h2>

            <p style="margin-bottom: 15px;">
              Your retailer training has been scheduled. Please review the details below:
            </p>

            <ul style="margin-bottom: 15px; padding-left: 20px;">
              <li><strong>Date:</strong> ${training_date}</li>
              <li><strong>Time:</strong> ${training_time}</li>
              <li><strong>Location:</strong> ${training_location}</li>
            </ul>

            <p style="margin-bottom: 15px;">
              Make sure to arrive on time and bring any required documents or identification.
            </p>

            <p style="margin-bottom: 15px;">
              You can log in to your Gasflow account to track your application progress:
            </p>

            <p style="margin-bottom: 15px;">
            </p>

            <p style="margin-bottom: 0;">Thank you and good luck!</p>
            <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
            &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
          </div>
        </div>
      `,
      }
    );

    res.json({
      success: true,
      message:
        "Training scheduled successfully and email sent.",
    });
  } catch (err) {
    console.error("❌ Schedule training error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


router.put(
  "/upload-exam-result/:processId",
  authenticateToken,
  uploadExamResult.single("exam_result_image"),
  async (req, res) => {
    try {
      if (!req.user || req.user.role.toLowerCase() !== "admin")
        return res
          .status(403)
          .json({ success: false, error: "Admins only." });

      const { processId } = req.params;
      const { exam_result } = req.body;

      if (!req.file)
        return res.status(400).json({
          success: false,
          error: "Exam result image is required.",
        });

      if (!["passed", "failed"].includes(exam_result))
        return res.status(400).json({
          success: false,
          error: "Exam result must be 'passed' or 'failed'.",
        });

      const imagePath = `/uploads/retailer/examResults/${req.file.filename}`;

      // Update database
      const [result] = await db.query(
        `UPDATE retailer_process
         SET exam_result = ?, exam_result_image = ?, process_status = 'pending_training'
         WHERE id = ?`,
        [exam_result, imagePath, processId]
      );

      if (result.affectedRows === 0)
        return res.status(404).json({
          success: false,
          error: "Retailer process not found.",
        });

      // Fetch retailer info for email
      const [retailerRows] = await db.query(
        `SELECT r.*, pa.name, pa.email 
         FROM retailer_process r
         JOIN pending_accounts pa ON pa.id = r.pending_account_id
         WHERE r.id = ?`,
        [processId]
      );

      if (!retailerRows.length)
        return res
          .status(404)
          .json({ success: false, error: "Retailer not found." });

      const retailer = retailerRows[0];

      // Path for attaching exam result image
      const fullImagePath = path.join(
        __dirname,
        "../uploads/retailer/examResults",
        req.file.filename

      );
      // SEND EMAIL
      await sendEmail(
        retailer.email,
        "📄 Gasflow Retailer Exam Result",
        {
          html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background-color: #0047ab; padding: 20px; text-align: center;">
            <img src="cid:logoWhite" width="120" alt="Gasflow Logo" style="display: block; margin: auto;" />
            <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
          </div>

          <!-- Body -->
          <div style="padding: 30px;">
            <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Dear ${retailer.name},</h2>

            <p style="margin-bottom: 15px;">
              Your examination results have been processed. Please find the summary below:
            </p>

            <ul style="margin-bottom: 15px; padding-left: 20px;">
              <li><strong>Exam Result:</strong> ${exam_result.toUpperCase()}</li>
            </ul>

            <p style="margin-bottom: 15px;">
              A copy of the official exam result document has been included as an attachment in this email.
            </p>

            <p style="margin-bottom: 0;">Thank you for your continued cooperation.</p>
            <p style="margin-top: 5px; color: #777;">The Gasflow Team</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
            &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
          </div>
        </div>
      `,
          attachments: [
            {
              filename: req.file.filename,
              path: fullImagePath,
            },
            {
              filename: "logoWhite.png",
              path: path.join(__dirname, "../../src/assets/design/LogoWhite.png"),
              cid: "logoWhite",
            },
          ],
        }
      );

      res.json({
        success: true,
        message:
          "Exam result uploaded and email sent successfully.",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);


// -----------------------------
// Pending Training / Pending Results / Completed Training Results
// -----------------------------
router.get("/pending-training", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") return res.status(403).json({ success: false, error: "Admins only." });

    const [trainingProcesses] = await db.query(`
      SELECT rp.id AS process_id, rp.process_status, rp.exam_date, rp.exam_time, rp.exam_location, rp.exam_result, rp.exam_result_image, rp.created_at AS process_created,
             p.id AS retailer_id, p.name, p.email, p.contact_number, p.role, p.status,
             b.barangay_name AS barangay, b.municipality
      FROM retailer_process rp
      JOIN pending_accounts p ON rp.pending_account_id = p.id
      LEFT JOIN barangays b ON p.barangay_id = b.barangay_id
      WHERE rp.process_status = 'pending_training'
    `);

    for (let record of trainingProcesses) {
      const [images] = await db.query("SELECT * FROM otp_images WHERE otp_id = ?", [record.retailer_id]);
      record.images = images;
    }

    res.json({ success: true, data: trainingProcesses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/pending-results", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") return res.status(403).json({ success: false, error: "Admins only." });

    const [pendingResultsProcesses] = await db.query(`
      SELECT rp.id AS process_id, rp.process_status, rp.exam_date, rp.exam_time, rp.exam_location, rp.exam_result, rp.exam_result_image, rp.created_at AS process_created,
             p.id AS retailer_id, p.name, p.email, p.contact_number, p.role, p.status,
             b.barangay_name AS barangay, b.municipality
      FROM retailer_process rp
      JOIN pending_accounts p ON rp.pending_account_id = p.id
      LEFT JOIN barangays b ON p.barangay_id = b.barangay_id
      WHERE rp.process_status = 'pending_results'
    `);

    res.json({ success: true, data: pendingResultsProcesses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.get("/completed-training-results", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin")
      return res.status(403).json({ success: false, error: "Admins only." });

    const [completedProcesses] = await db.query(`
      SELECT 
        rp.id AS process_id,
        rp.process_status,
        rp.training_result,
        rp.created_at AS process_created,
        p.id AS retailer_id,
        p.name,
        p.email,
        p.contact_number,
        p.role,
        p.status,
        b.barangay_name AS barangay,
        b.municipality
      FROM retailer_process rp
      JOIN pending_accounts p ON rp.pending_account_id = p.id
      LEFT JOIN barangays b ON p.barangay_id = b.barangay_id
      WHERE rp.process_status = 'completed'
        AND rp.training_result = 'passed'
        AND p.status = 'completed'
    `);

    // Attach OTP images (optional)
    for (let record of completedProcesses) {
      const [images] = await db.query(
        "SELECT * FROM otp_images WHERE otp_id = ?",
        [record.retailer_id]
      );

      record.images = images;
    }

    res.json({ success: true, data: completedProcesses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
