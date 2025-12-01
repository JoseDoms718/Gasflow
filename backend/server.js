// backend/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./config/db"); // your database connection

/* -----------------------------------------
   ✅ Import Routes
----------------------------------------- */
const usersRoutes = require("./routes/users");
const barangaysRoutes = require("./routes/barangays");
const authRoutes = require("./routes/authRoutes");
const retailersRoutes = require("./routes/retailers");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const expensesRoutes = require("./routes/expenses");
const verifyOtpRoute = require("./routes/verifyotp");
const sendOtpRoute = require("./routes/sendotp");
const businessOwnerRoutes = require("./routes/businessOwnerSignup");
const branchInfoRoutes = require("./routes/branchinfo"); // branch routes
const bannersRoutes = require("./routes/banners");
const damagedProductsRoute = require("./routes/damagedProducts");
const chatRoutes = require("./routes/chat"); // renamed to match chat.js
const servicesRoutes = require("./routes/services");
const branchesRoutes = require("./routes/branch");
const deliveryfeesRoutes = require("./routes/deliveryfee");
/* -----------------------------------------
   ✅ Initialize App & Server
----------------------------------------- */
const app = express();
const server = http.createServer(app);

/* -----------------------------------------
   ✅ Socket.IO Setup
----------------------------------------- */
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Make io accessible in routes
app.set("io", io);

// Socket connection
io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  // Join room for private chats
  socket.on("joinRoom", (conversationId) => {
    socket.join(`room_${conversationId}`);
    console.log(`Socket ${socket.id} joined room_${conversationId}`);
  });

  // Listen for new messages
  socket.on("sendMessage", async (data) => {
    const { conversationId, senderId, text } = data;
    try {
      // Save message to DB
      const [result] = await db.query(
        "INSERT INTO messages (conversationId, senderId, text) VALUES (?, ?, ?)",
        [conversationId, senderId, text]
      );

      // Fetch saved message with sender info
      const [messages] = await db.query(
        `SELECT m.*, u.user_id, u.name AS senderName
         FROM messages m
         JOIN users u ON m.senderId = u.user_id
         WHERE m.id = ?`,
        [result.insertId]
      );

      // Broadcast to everyone in the room
      io.to(`room_${conversationId}`).emit("receiveMessage", messages[0]);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

/* -----------------------------------------
   ✅ Middleware
----------------------------------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

/* -----------------------------------------
   ✅ Serve Static Images
----------------------------------------- */
app.use(
  "/products/images",
  express.static(path.join(__dirname, "../src/assets/products"))
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -----------------------------------------
   ✅ Mount Routes
----------------------------------------- */
app.use("/users", usersRoutes);
app.use("/barangays", barangaysRoutes);
app.use("/auth", authRoutes);
app.use("/retailers", retailersRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/expenses", expensesRoutes);
app.use("/verify-otp", verifyOtpRoute);
app.use("/send-otp", sendOtpRoute);
app.use("/business-owner", businessOwnerRoutes);
app.use("/branchinfo", branchInfoRoutes);
app.use("/banners", bannersRoutes);
app.use("/damaged-products", damagedProductsRoute);
app.use("/services", servicesRoutes);
app.use("/branches", branchesRoutes);
app.use("/fee", deliveryfeesRoutes);
/* -----------------------------------------
   ✅ Chat Routes (no /api prefix)
----------------------------------------- */
app.use("/chat", chatRoutes);

/* -----------------------------------------
   ✅ Test Route
----------------------------------------- */
app.get("/", (req, res) => {
  res.send("✅ Solane LPG backend is running with Socket.IO...");
});

/* -----------------------------------------
   ✅ Start Server
----------------------------------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
