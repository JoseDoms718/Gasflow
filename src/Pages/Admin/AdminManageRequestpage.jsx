import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ManageRequestsSection from "../../Components/AdminSide/ManageRequestsection";
import RetailerReqSection from "../../Components/BranchSide/RetailerReqsection";

export default function ManageRequestsPage() {
  const [activeTab, setActiveTab] = useState("user");
  const navigate = useNavigate();

  return (
    <div className="p-6 w-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Requests</h2>

        {/* ✅ Back Button on the right */}
        <button
          onClick={() => navigate("/adminmanageuser")}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("user")}
          className={`px-4 py-2 font-semibold transition border-b-2 ${
            activeTab === "user"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          Business Owner Requests
        </button>

        <button
          onClick={() => setActiveTab("retailer")}
          className={`px-4 py-2 font-semibold transition border-b-2 ${
            activeTab === "retailer"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          Retailer Requests
        </button>
      </div>

      {/* Content Switch */}
      <div className="flex-1">
        {activeTab === "user" ? <ManageRequestsSection /> : <RetailerReqSection />}
      </div>
    </div>
  );
}
