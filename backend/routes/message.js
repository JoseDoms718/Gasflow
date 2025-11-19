require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");

/* -----------------------------------------
   ✅ Create or Get Conversation
----------------------------------------- */
router.post("/create", authenticateToken, async (req, res) => {
  const senderId = req.user.id; // logged-in user
  const { receiverId } = req.body; // branch manager's user_id

  if (!receiverId) {
    return res.status(400).json({ success: false, error: "receiverId is required" });
  }

  try {
    // Check if conversation already exists
    const [existing] = await db.query(
      `SELECT * FROM conversations
       WHERE (clientId = ? AND managerId = ?) OR (clientId = ? AND managerId = ?)`,
      [senderId, receiverId, receiverId, senderId]
    );

    let conversation;
    if (existing.length > 0) {
      conversation = existing[0];
    } else {
      // Create new conversation
      const [result] = await db.query(
        "INSERT INTO conversations (clientId, managerId) VALUES (?, ?)",
        [senderId, receiverId]
      );
      conversation = { conversation_id: result.insertId, clientId: senderId, managerId: receiverId };
    }

    res.json({ success: true, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* -----------------------------------------
   ✅ Get all messages for a conversation
----------------------------------------- */
router.get("/:conversationId/messages", authenticateToken, async (req, res) => {
  const { conversationId } = req.params;

  try {
    const [messages] = await db.query(
      `SELECT m.*, u.user_id, u.name AS senderName
       FROM messages m
       JOIN users u ON m.senderId = u.user_id
       WHERE m.conversationId = ?
       ORDER BY m.createdAt ASC`,
      [conversationId]
    );
    res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* -----------------------------------------
   ✅ Send a new message
----------------------------------------- */
router.post("/messages", authenticateToken, async (req, res) => {
  const senderId = req.user.id;
  const { conversationId, text } = req.body;

  if (!conversationId || !text) {
    return res
      .status(400)
      .json({ success: false, error: "conversationId and text are required" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO messages (conversationId, senderId, text) VALUES (?, ?, ?)",
      [conversationId, senderId, text]
    );

    // Fetch the saved message with sender info
    const [messages] = await db.query(
      `SELECT m.*, u.user_id, u.name AS senderName
       FROM messages m
       JOIN users u ON m.senderId = u.user_id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const newMessage = messages[0];

    // Emit via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`room_${conversationId}`).emit("receiveMessage", newMessage);
    }

    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* -----------------------------------------
   ✅ List all conversations for logged-in user
----------------------------------------- */
router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [conversations] = await db.query(
      `SELECT c.id AS conversation_id, 
              CASE 
                WHEN c.clientId = ? THEN m.user_id
                ELSE c.clientId
              END AS otherUserId,
              u.name AS otherUserName,
              msg.text AS lastMessage,
              msg.createdAt AS updatedAt
       FROM conversations c
       JOIN users u ON u.user_id = CASE 
                                      WHEN c.clientId = ? THEN c.managerId
                                      ELSE c.clientId
                                   END
       LEFT JOIN messages msg ON msg.id = (
         SELECT id FROM messages 
         WHERE conversationId = c.id 
         ORDER BY createdAt DESC 
         LIMIT 1
       )
       WHERE c.clientId = ? OR c.managerId = ?
       ORDER BY updatedAt DESC`,
      [userId, userId, userId, userId]
    );

    res.json({ success: true, conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
