import React, { useState } from "react";
import Sidebar from "../../Components/BranchSide/Sidebar";
import Inventorysection from "../../Components/BranchSide/Inventorysection";
import BranchMarketSection from "../../Components/BranchSide/BranchMarketSection";
import Orderlist from "../../Components/UserSide/Orderlist";

export default function RetailerInventorypage() {
  const [activeTab, setActiveTab] = useState("inventory");

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar on the left */}
      <aside className="w-64 bg-white shadow-lg">
        <Sidebar />
      </aside>

      {/* Main content on the right */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="p-6 w-full flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-2 pb-1">


            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2 font-semibold transition border-b-2 ${activeTab === "inventory"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              My Inventory
            </button>

            <button
              onClick={() => setActiveTab("market")}
              className={`px-4 py-2 font-semibold transition border-b-2 ${activeTab === "market"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              Branch Market
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 font-semibold transition border-b-2 ${activeTab === "orders"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              Pending Orders
            </button>
          </div>

          {/* Content Switch */}
          <div className="flex-1">
            {activeTab === "inventory" && <Inventorysection />}
            {activeTab === "market" && <BranchMarketSection />}
            {activeTab === "orders" && <Orderlist />}
          </div>
        </div>
      </main>
    </div>
  );
}
