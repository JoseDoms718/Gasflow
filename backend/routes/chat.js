require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticateToken = require("../middleware/authtoken");

/*
|--------------------------------------------------------------------------
| ✅ APPLY AUTH TO ALL CHAT ROUTES
|--------------------------------------------------------------------------
*/
router.use(authenticateToken);

/*
|--------------------------------------------------------------------------
| ✅ ROLE-BASED CHAT PERMISSIONS
|--------------------------------------------------------------------------
*/
const canChat = (senderRole, receiverRole) => {
  const rules = {
    retailer: ["branch_manager", "admin"],
    business_owner: ["branch_manager", "admin"],
    branch_manager: ["retailer", "business_owner", "users", "admin"],
    admin: ["retailer", "business_owner", "branch_manager", "users"],
    users: ["branch_manager", "admin"],
  };

  return rules[senderRole]?.includes(receiverRole);
};

/*
|--------------------------------------------------------------------------
| 1️⃣ GET MESSAGES BY CONVERSATION
|--------------------------------------------------------------------------
*/
router.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    // ✅ Ensure user belongs to conversation
    const [[conversation]] = await db.query(
      `
      SELECT conversation_id FROM conversations
      WHERE conversation_id = ?
      AND ? IN (user_one_id, user_two_id)
      `,
      [conversationId, userId]
    );

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Mark messages as read (only messages NOT sent by user)
    await db.query(
      `
      UPDATE messages 
      SET read_status = 1
      WHERE conversation_id = ?
      AND sender_id != ?
      `,
      [conversationId, userId]
    );

    // ✅ Fetch messages with sender role
    const [messages] = await db.query(
      `
      SELECT 
        m.message_id,
        m.conversation_id,
        m.sender_id,
        u.name AS sender_name,
        u.role AS sender_role,           -- Added role
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
| 2️⃣ CREATE / GET CONVERSATION
|--------------------------------------------------------------------------
*/
router.post("/conversations", async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.body.receiverId;

  if (!receiverId) {
    return res.status(400).json({
      error: "receiverId is required",
    });
  }

  try {
    const [[sender]] = await db.query(
      "SELECT role FROM users WHERE user_id = ?",
      [senderId]
    );
    const [[receiver]] = await db.query(
      "SELECT role FROM users WHERE user_id = ?",
      [receiverId]
    );

    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    if (!canChat(sender.role, receiver.role)) {
      return res.status(403).json({
        error: "You are not allowed to chat with this user",
      });
    }

    const userOne = Math.min(senderId, receiverId);
    const userTwo = Math.max(senderId, receiverId);

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
    console.error("❌ Conversation error:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/*
|--------------------------------------------------------------------------
| 3️⃣ GET LOGGED-IN USER CONVERSATIONS
|--------------------------------------------------------------------------
*/
router.get("/conversations/user", async (req, res) => {
  const userId = req.user.id;

  try {
    const [conversations] = await db.query(
      `
      SELECT
        c.conversation_id,
        u.user_id AS other_user_id,
        u.name AS other_user_name,
        u.role AS other_user_role,          -- Added role
        last.message_text AS last_message,
        last.created_at AS last_message_time,
        COUNT(
          CASE 
            WHEN m.read_status = 0 AND m.sender_id != ? THEN 1
          END
        ) AS unread_count
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
      LEFT JOIN messages m 
        ON m.conversation_id = c.conversation_id
      WHERE ? IN (c.user_one_id, c.user_two_id)
      GROUP BY c.conversation_id, last.message_id
      ORDER BY last.created_at DESC
      `,
      [userId, userId, userId]
    );

    res.json(conversations);
  } catch (err) {
    console.error("❌ Error loading conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});


/*
|--------------------------------------------------------------------------
| 4️⃣ SEND MESSAGE
|--------------------------------------------------------------------------
*/
router.post("/messages", async (req, res) => {
  const senderId = req.user.id;
  const { conversationId, messageText } = req.body;

  if (!conversationId || !messageText) {
    return res.status(400).json({
      error: "conversationId and messageText are required",
    });
  }

  try {
    // ✅ Verify user is part of conversation
    const [[conversation]] = await db.query(
      `
      SELECT conversation_id FROM conversations
      WHERE conversation_id = ?
      AND ? IN (user_one_id, user_two_id)
      `,
      [conversationId, senderId]
    );

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [result] = await db.query(
      `
      INSERT INTO messages (conversation_id, sender_id, message_text)
      VALUES (?, ?, ?)
      `,
      [conversationId, senderId, messageText]
    );

    const [[message]] = await db.query(
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
      WHERE m.message_id = ?
      `,
      [result.insertId]
    );

    res.json(message);
  } catch (err) {
    console.error("❌ Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
