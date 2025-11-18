const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

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
const retailerRoutes = require("./routes/retailerSignup");
const damagedProductsRoute = require("./routes/damagedProducts");
const chatRoutes = require("./routes/chat");
const servicesRoutes = require("./routes/services");

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
    origin: process.env.FRONTEND_URL, // frontend URL
    methods: ["GET", "POST"],
  },
});

// Make io accessible in routes
app.set("io", io);

io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  // Join room for private chats (optional)
  socket.on("joinRoom", (conversationId) => {
    socket.join(`room_${conversationId}`);
    console.log(`Socket ${socket.id} joined room_${conversationId}`);
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
app.use("/retailerSignup", retailerRoutes);
app.use("/damaged-products", damagedProductsRoute);
app.use("/services", servicesRoutes);

/* -----------------------------------------
   ✅ Chat Routes
----------------------------------------- */
app.use("/api/chat", chatRoutes);

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
