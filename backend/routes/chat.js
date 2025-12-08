require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");

/*
|--------------------------------------------------------------------------
| 1️⃣ GET messages by conversation
|--------------------------------------------------------------------------
*/
router.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ error: "conversationId is required" });
  }

  try {
    const [messages] = await db.query(
      `
      SELECT 
        m.message_id,
        m.conversation_id,
        m.sender_id,
        u.name AS sender_name,
        m.message_text,
        m.read_status,
        m.created_at
      FROM messages m
      JOIN users u ON u.user_id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      `,
      [conversationId]
    );

    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/*
|--------------------------------------------------------------------------
| 2️⃣ CREATE or GET conversation between two users
|--------------------------------------------------------------------------
| Rule: always (smaller ID → user_one_id)
|--------------------------------------------------------------------------
*/
router.post("/conversations", async (req, res) => {
  const { senderId, receiverId } = req.body;

  if (!senderId || !receiverId) {
    return res
      .status(400)
      .json({ error: "senderId and receiverId are required" });
  }

  const userOne = Math.min(senderId, receiverId);
  const userTwo = Math.max(senderId, receiverId);

  try {
    // Check existing conversation
    const [existing] = await db.query(
      `
      SELECT * FROM conversations
      WHERE user_one_id = ? AND user_two_id = ?
      `,
      [userOne, userTwo]
    );

    if (existing.length > 0) {
      return res.json(existing[0]);
    }

    // Create new conversation
    const [result] = await db.query(
      `
      INSERT INTO conversations (user_one_id, user_two_id)
      VALUES (?, ?)
      `,
      [userOne, userTwo]
    );

    res.json({
      conversation_id: result.insertId,
      user_one_id: userOne,
      user_two_id: userTwo,
    });
  } catch (err) {
    console.error("❌ Error creating conversation:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/*
|--------------------------------------------------------------------------
| 3️⃣ GET conversations of a user (with last message)
|--------------------------------------------------------------------------
*/
router.get("/conversations/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [conversations] = await db.query(
      `
      SELECT
        c.conversation_id,
        c.user_one_id,
        c.user_two_id,
        u.user_id AS other_user_id,
        u.name AS other_user_name,
        last.message_text AS last_message,
        last.created_at AS last_message_time
      FROM conversations c
      JOIN users u
        ON u.user_id = IF(c.user_one_id = ?, c.user_two_id, c.user_one_id)
      LEFT JOIN messages last
        ON last.message_id = (
          SELECT m2.message_id
          FROM messages m2
          WHERE m2.conversation_id = c.conversation_id
          ORDER BY m2.created_at DESC
          LIMIT 1
        )
      WHERE ? IN (c.user_one_id, c.user_two_id)
      ORDER BY last.created_at DESC
      `,
      [userId, userId]
    );

    res.json(conversations);
  } catch (err) {
    console.error("❌ Error loading conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

/*
|--------------------------------------------------------------------------
| 4️⃣ SEND message
|--------------------------------------------------------------------------
*/
router.post("/messages", async (req, res) => {
  const { conversationId, senderId, messageText } = req.body;

  if (!conversationId || !senderId || !messageText) {
    return res.status(400).json({
      error: "conversationId, senderId and messageText are required",
    });
  }

  try {
    const [result] = await db.query(
      `
      INSERT INTO messages (conversation_id, sender_id, message_text)
      VALUES (?, ?, ?)
      `,
      [conversationId, senderId, messageText]
    );

    const message = {
      message_id: result.insertId,
      conversation_id: conversationId,
      sender_id: senderId,
      message_text: messageText,
      read_status: 0,
      created_at: new Date(),
    };

    // ✅ Socket.IO emit
    const io = req.app.get("io");
    if (io) {
      io.to(`conversation_${conversationId}`).emit(
        "receive_message",
        message
      );
    }

    res.json(message);
  } catch (err) {
    console.error("❌ Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
