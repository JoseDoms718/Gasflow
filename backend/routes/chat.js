const express = require("express");
const router = express.Router();
const db = require("../config/db");

// -------------------- GET messages --------------------
router.get("/messages/:conversationId", (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ message: "conversationId is required." });
  }

  db.query(
    "SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC",
    [conversationId],
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching messages:", err);
        return res.status(500).json({ message: "Database error" });
      }

      const formatted = results.map((msg) => ({
        ...msg,
        time: msg.createdAt, // raw timestamp
        readableTime: new Date(msg.createdAt).toLocaleString(), // frontend-friendly
      }));

      res.json(formatted);
    }
  );
});

// -------------------- POST conversation --------------------
router.post("/conversations", (req, res) => {
  const { clientId, managerId } = req.body;

  if (!clientId || !managerId) {
    return res
      .status(400)
      .json({ message: "clientId and managerId are required." });
  }

  db.query(
    "SELECT * FROM conversations WHERE clientId = ? AND managerId = ?",
    [clientId, managerId],
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching conversation:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length > 0) {
        res.json(results[0]);
      } else {
        db.query(
          "INSERT INTO conversations (clientId, managerId) VALUES (?, ?)",
          [clientId, managerId],
          (err, result) => {
            if (err) {
              console.error("❌ Error creating conversation:", err);
              return res.status(500).json({ message: "Database error" });
            }
            res.json({ id: result.insertId, clientId, managerId });
          }
        );
      }
    }
  );
});

// -------------------- GET conversations by manager --------------------
router.get("/conversations/manager/:managerId", (req, res) => {
  const { managerId } = req.params;

  if (!managerId) {
    return res.status(400).json({ message: "managerId is required." });
  }

  const query = `
    SELECT 
      c.id AS conversationId,
      c.clientId,
      u.name AS clientName,
      m.text AS lastMessage,
      m.createdAt AS lastMessageTime
    FROM conversations c
    LEFT JOIN users u ON c.clientId = u.user_id
    LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages 
        WHERE conversationId = c.id 
        ORDER BY createdAt DESC 
        LIMIT 1
    )
    WHERE FIND_IN_SET(?, c.managerId) -- <-- managerId can be one of many
    ORDER BY m.createdAt DESC
  `;

  db.query(query, [managerId], (err, results) => {
    if (err) {
      console.error("❌ Error loading conversations:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});

// -------------------- POST message --------------------
router.post("/messages", (req, res) => {
  const { conversationId, senderId, text } = req.body;

  if (!conversationId || !senderId || !text) {
    return res
      .status(400)
      .json({ message: "conversationId, senderId, and text are required." });
  }

  db.query(
    "INSERT INTO messages (conversationId, senderId, text) VALUES (?, ?, ?)",
    [conversationId, senderId, text],
    (err, result) => {
      if (err) {
        console.error("❌ Error saving message:", err);
        return res.status(500).json({ message: "Database error" });
      }

      const message = {
        id: result.insertId,
        conversationId,
        senderId,
        text,
        createdAt: new Date().toISOString(),
        readableTime: new Date().toLocaleString(),
      };

      // Emit via Socket.IO if available
      const io = req.app.get("io");
      if (io) io.to(`room_${conversationId}`).emit("receiveMessage", message);

      res.json(message);
    }
  );
});

module.exports = router;