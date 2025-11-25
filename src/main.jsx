// main.jsx
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollUp from "./Components/ScrollUp";
import DisableAutocomplete from "./Components/DisableAutocomplete";
import AutoRedirect from "./Components/AutoRedirect";
import ToastComponent from "./Components/ToastComponent";
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
import Inquirypage from "./Pages/User/Inquirypage";

// Branch Manager
import BranchOrderpage from "./Pages/BranchManager/BranchOrderPage";
import BranchInventorypage from "./Pages/BranchManager/branchinventorypage";
import BranchSalesReportPage from "./Pages/BranchManager/BranchSalesReportpage";
import WalkinOrderpage from "./Pages/BranchManager/WalkinOrderPage";
import BranchRetailerpage from "./Pages/BranchManager/BranchRetailerpage";
import RetailerReqPage from "./Pages/BranchManager/RetailerReqpage";
import BranchInquirypage from "./Pages/BranchManager/BranchInquirypage";

// Retailer
import RetailerSalesReportpage from "./Pages/Retailer/RetailerSalesReportpage";
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollUp />
      <DisableAutocomplete />
      <AutoRedirect /> {/* ✅ Auto redirect runs here */}
      <ToastComponent />

      <Routes>
        {/* USER */}
        <Route path="/" element={<Landingpage />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/login" element={<Loginpage />} />
        <Route path="/products" element={<Productspage />} />
        <Route path="/buy/:id" element={<Buypage />} />
        <Route path="/orders" element={<Orderspage />} />
        <Route path="/contact" element={<Contactpage />} />
        <Route path="/services" element={<Servicespage />} />
        <Route path="/inquiry" element={<Inquirypage />} />

        {/* BRANCH MANAGER */}
        <Route path="/branchorder" element={<BranchOrderpage />} />
        <Route path="/branchinventory" element={<BranchInventorypage />} />
        <Route path="/branchsalesreport" element={<BranchSalesReportPage />} />
        <Route path="/branchretailer" element={<BranchRetailerpage />} />
        <Route path="/walkinorder" element={<WalkinOrderpage />} />
        <Route path="/retailerreq" element={<RetailerReqPage />} />
        <Route path="/branchinquiries" element={<BranchInquirypage />} />

        {/* RETAILER */}
        <Route path="/retailerinventory" element={<RetailerInventorypage />} />
        <Route path="/retailersalesreport" element={<RetailerSalesReportpage />} />
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
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
