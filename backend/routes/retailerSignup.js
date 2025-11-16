const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authenticateToken = require("../middleware/authtoken");

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

    res.json({ success: true, message: "✅ Retailer approved successfully." });
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

    const [pendingRecords] = await db.query("SELECT * FROM pending_accounts WHERE id = ?", [pendingId]);
    if (pendingRecords.length === 0) return res.status(404).json({ error: "Pending account not found." });

    const [existingProcess] = await db.query("SELECT * FROM retailer_process WHERE pending_account_id = ?", [pendingId]);
    if (existingProcess.length > 0) return res.status(400).json({ error: "Process already initialized for this account." });

    await db.query(
      `INSERT INTO retailer_process 
       (pending_account_id, process_status, created_at, updated_at) 
       VALUES (?, 'pending', NOW(), NOW())`,
      [pendingId]
    );

    await db.query("UPDATE pending_accounts SET status = 'processing', updated_at = NOW() WHERE id = ?", [pendingId]);

    res.json({ success: true, message: "✅ Retailer process initialized successfully and status updated to 'processing'." });
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
    const { result } = req.body; // "Pass" or "Failed"

    if (!result || !["passed", "failed"].includes(result)) {
      return res.status(400).json({ error: "Invalid training result. Must be 'passed' or 'failed'." });
    }

    const [processRows] = await db.query("SELECT * FROM retailer_process WHERE id = ?", [processId]);
    if (processRows.length === 0) return res.status(404).json({ error: "Process not found." });

    const process = processRows[0];
    const pendingId = process.pending_account_id;

    await db.query(
      `UPDATE retailer_process 
       SET training_result = ?, process_status = 'completed', updated_at = NOW() 
       WHERE id = ?`,
      [result, processId]
    );

    await db.query("UPDATE pending_accounts SET status = 'completed', updated_at = NOW() WHERE id = ?", [pendingId]);

    res.json({ success: true, message: `✅ Training result set to '${result}' and process marked as completed.` });
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

    const [pendingRecords] = await db.query("SELECT * FROM pending_accounts WHERE id = ?", [pendingId]);
    if (pendingRecords.length === 0) return res.status(404).json({ error: "Pending registration not found." });

    const [images] = await db.query("SELECT * FROM otp_images WHERE otp_id = ?", [pendingId]);
    for (let img of images) {
      const filePath = path.join(__dirname, "../", img.image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.query("DELETE FROM otp_images WHERE otp_id = ?", [pendingId]);
    await db.query("DELETE FROM pending_accounts WHERE id = ?", [pendingId]);

    res.json({ success: true, message: "❌ Retailer registration rejected successfully." });
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
    if (!req.user || req.user.role.toLowerCase() !== "admin") return res.status(403).json({ success: false, error: "Admins only." });

    const { processId } = req.params;
    const { exam_date, exam_time, exam_location } = req.body;

    if (!exam_date || !exam_time || !exam_location) return res.status(400).json({ success: false, error: "Exam date, time, and location are required." });

    const [result] = await db.query(
      `UPDATE retailer_process 
       SET exam_date = ?, exam_time = ?, exam_location = ?, process_status = 'pending_exam' 
       WHERE id = ?`,
      [exam_date, exam_time, exam_location, processId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Retailer process not found." });

    res.json({ success: true, message: "Exam scheduled successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.put("/schedule-training/:processId", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") return res.status(403).json({ success: false, error: "Admins only." });

    const { processId } = req.params;
    const { training_date, training_time, training_location } = req.body;

    if (!training_date || !training_time || !training_location)
      return res.status(400).json({ success: false, error: "Training date, time, and location are required." });

    const [result] = await db.query(
      `UPDATE retailer_process 
       SET training_date = ?, training_time = ?, training_location = ?, process_status = 'pending_results'
       WHERE id = ?`,
      [training_date, training_time, training_location, processId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Retailer process not found." });

    res.json({ success: true, message: "Training scheduled successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.put("/upload-exam-result/:processId", authenticateToken, uploadExamResult.single("exam_result_image"), async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== "admin") return res.status(403).json({ success: false, error: "Admins only." });

    const { processId } = req.params;
    const { exam_result } = req.body;

    if (!req.file) return res.status(400).json({ success: false, error: "Exam result image is required." });
    if (!["passed", "failed"].includes(exam_result)) return res.status(400).json({ success: false, error: "Exam result must be 'passed' or 'failed'." });

    const imagePath = `/uploads/retailer/examResults/${req.file.filename}`;

    const [result] = await db.query(
      `UPDATE retailer_process
       SET exam_result = ?, exam_result_image = ?, process_status = 'pending_training'
       WHERE id = ?`,
      [exam_result, imagePath, processId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Retailer process not found." });

    res.json({ success: true, message: "Exam result uploaded and process status updated to pending_training." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

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
