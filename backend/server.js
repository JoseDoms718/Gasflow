const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

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

/* -----------------------------------------
   ✅ Initialize App
----------------------------------------- */
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // adjust for your frontend URL
    credentials: true,
  })
);
app.use(express.json());

/* -----------------------------------------
   ✅ Serve Static Images
----------------------------------------- */
// Product images
app.use(
  "/products/images",
  express.static(path.join(__dirname, "../src/assets/products"))
);

// Uploaded files (like branch pictures)
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
/* -------------------------------
   ✅ Mount Branch Info Routes
--------------------------------- */
// Public endpoints (all branches)
app.use("/api/branches", branchInfoRoutes); // now frontend can use /api/branches/all

/* -----------------------------------------
   ✅ Test Route (Optional)
----------------------------------------- */
app.get("/", (req, res) => {
  res.send("✅ Solane LPG backend is running...");
});

/* -----------------------------------------
   ✅ Start Server
----------------------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
