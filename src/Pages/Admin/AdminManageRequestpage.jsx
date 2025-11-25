import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ManageRequestsSection from "../../Components/AdminSide/ManageRequestsection";

export default function ManageRequestsPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 w-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Business Owner Requests</h2>

        {/* Back Button */}
        <button
          onClick={() => navigate("/adminmanageuser")}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      {/* Only the business owner requests section */}
      <div className="flex-1">
        <ManageRequestsSection />
      </div>
    </div>
  );
}
