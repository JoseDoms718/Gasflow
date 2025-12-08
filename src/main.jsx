// main.jsx
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import ScrollUp from "./Components/ScrollUp";
import DisableAutocomplete from "./Components/DisableAutocomplete";
import AutoRedirect from "./Components/AutoRedirect";
import ToastComponent from "./Components/ToastComponent";
import ChatModal from "./Components/Modals/ChatModalRedirect";
import "./index.css";

// Customer
import Landingpage from "./Pages/Landingpage";
import Homepage from "./Pages/User/Homepage";
import Productspage from "./Pages/User/Productspage";
import Orderspage from "./Pages/User/Orderspage";
import Contactpage from "./Pages/User/Contactpage";
import Servicespage from "./Pages/User/Servicespage";
import Loginpage from "./Pages/Loginpage";
import Buypage from "./Pages/User/Buypage";
import BuyBundlepage from "./Pages/User/BuyBundlepage";
import Inquirypage from "./Pages/User/Inquirypage";
import Loanpage from "./Pages/User/Loanpage";

// Branch Manager
import BranchOrderpage from "./Pages/BranchManager/BranchOrderPage";
import BranchInventorypage from "./Pages/BranchManager/branchinventorypage";
import BranchSalesReportPage from "./Pages/BranchManager/BranchSalesReportpage";
import WalkinOrderpage from "./Pages/BranchManager/WalkinOrderPage";
import BranchRetailerpage from "./Pages/BranchManager/BranchRetailerpage";
import BranchInquirypage from "./Pages/BranchManager/BranchInquirypage";
import BranchLoanpage from "./Pages/BranchManager/Branchloanpage";

// Retailer
import RetailerInventorypage from "./Pages/Retailer/RetailerInventorypage";
import RetailerInquirypage from "./Pages/Retailer/RetailerInquirypage";

// Admin
import AdminInventorypage from "./Pages/Admin/AdminInventorypage";
import AdminSalesReportPage from "./Pages/Admin/AdminSalesReportpage";
import AdminManageUserpage from "./Pages/Admin/AdminManageUserpage";
import AdminMaintenancepage from "./Pages/Admin/AdminMaintenancepage";
import AdminManagebanners from "./Pages/Admin/AdminManagebannerpage";
import AdminManageservicespage from "./Pages/Admin/AdminManageservicepage";
import AdminManageUserRequestpage from "./Pages/Admin/AdminManageUserRequestpage";
import AdminInquirypage from "./Pages/Admin/AdminInquirypage";
import Deliveryfeepage from "./Pages/Admin/Deliveryfeepage";

// ✅ Customer routes list
const customerRoutes = [
  "/",
  "/homepage",
  "/products",
  "/buy/:id",
  "/buybundle/:id",
  "/orders",
  "/contact",
  "/services",
  "/inquiry",
  "/loan"
];

// ✅ Wrapper to conditionally render ChatModal
function AppWrapper() {
  const location = useLocation();

  const showChatModal = customerRoutes.some((path) => {
    if (path.includes(":")) {
      const base = path.split("/:")[0];
      return location.pathname.startsWith(base);
    }
    return location.pathname === path;
  });

  return (
    <>
      {showChatModal && <ChatModal />} {/* Show chat button only on customer pages */}
      <Routes>
        {/* USER */}
        <Route path="/" element={<Landingpage />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/login" element={<Loginpage />} />
        <Route path="/products" element={<Productspage />} />
        <Route path="/buy/:id" element={<Buypage />} />
        <Route path="/buybundle/:id" element={<BuyBundlepage />} />
        <Route path="/orders" element={<Orderspage />} />
        <Route path="/contact" element={<Contactpage />} />
        <Route path="/services" element={<Servicespage />} />
        <Route path="/inquiry" element={<Inquirypage />} />
        <Route path="/loan" element={<Loanpage />} />

        {/* BRANCH MANAGER */}
        <Route path="/branchorder" element={<BranchOrderpage />} />
        <Route path="/branchinventory" element={<BranchInventorypage />} />
        <Route path="/branchsalesreport" element={<BranchSalesReportPage />} />
        <Route path="/branchretailer" element={<BranchRetailerpage />} />
        <Route path="/walkinorder" element={<WalkinOrderpage />} />
        <Route path="/branchinquiries" element={<BranchInquirypage />} />
        <Route path="/branchloans" element={<BranchLoanpage />} />

        {/* RETAILER */}
        <Route path="/retailerinventory" element={<RetailerInventorypage />} />
        <Route path="/retailerinquiries" element={<RetailerInquirypage />} />

        {/* ADMIN */}
        <Route path="/admininventory" element={<AdminInventorypage />} />
        <Route path="/adminsalesreport" element={<AdminSalesReportPage />} />
        <Route path="/adminmanageuser" element={<AdminManageUserpage />} />
        <Route path="/adminmaintenance" element={<AdminMaintenancepage />} />
        <Route path="/adminmanagebanners" element={<AdminManagebanners />} />
        <Route path="/adminmanageservices" element={<AdminManageservicespage />} />
        <Route path="/adminmanageuserrequest" element={<AdminManageUserRequestpage />} />
        <Route path="/admininquiries" element={<AdminInquirypage />} />
        <Route path="/admindeliveryfees" element={<Deliveryfeepage />} />
      </Routes>
    </>
  );
}

// ✅ Render App
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollUp />
      <DisableAutocomplete />
      <AutoRedirect />
      <ToastComponent />
      <AppWrapper />
    </BrowserRouter>
  </StrictMode>
);
