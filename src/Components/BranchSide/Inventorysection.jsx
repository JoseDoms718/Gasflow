import React, { useState, useEffect } from "react";
import { PlusCircle, Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

import ProductTable from "./ProductTable";
import AddProductModal from "./AddProductModal";
import RestockHistory from "./RestockHistory";
import AdminProducts from "../Modals/AdminProducts";

export default function Inventory() {
  const [userRole, setUserRole] = useState(null);
  const [products, setProducts] = useState([]);
  const [restockHistory, setRestockHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [restockCounter, setRestockCounter] = useState(0);

  const branches = ["All", "Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

  // Load user role from localStorage once
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUserRole(parsedUser.role);
    }
  }, []);

  const handleRestockUpdate = () => setRestockCounter((prev) => prev + 1);

  const handleExportExcel = () => {
    if (!products.length && (!restockHistory.length || userRole === "admin")) {
      return toast.error("No data to export.");
    }

    const timestamp = new Date()
      .toLocaleString("en-PH", { timeZone: "Asia/Manila" })
      .replace(/[/:,]/g, "-")
      .replace(/\s+/g, "_");

    const wb = XLSX.utils.book_new();

    if (products.length) {
      const productData = products.map((p) => ({
        "Product Name": p.product_name || "N/A",
        "Price (₱)": p.price ? Number(p.price).toFixed(2) : "0.00",
        Stock: p.stock || 0,
        Branch: p.branch || "N/A",
      }));

      const ws1 = XLSX.utils.json_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, ws1, "Inventory");
    }

    if (restockHistory.length && userRole !== "admin") {
      const historyData = restockHistory.map((h) => ({
        "Product Name": h.product_name,
        Quantity: h.quantity,
        "Previous Stock": h.previous_stock,
        "New Stock": h.new_stock,
        "Restocked By": h.restocked_by_name || "-",
        Date: h.restocked_at ? new Date(h.restocked_at).toLocaleString("en-PH") : "-",
      }));

      const ws2 = XLSX.utils.json_to_sheet(historyData);
      XLSX.utils.book_append_sheet(wb, ws2, "Restock History");
    }

    const fileName = `Inventory_${selectedBranch}_${timestamp}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout]), fileName);
  };

  // Only render ProductTable once userRole is loaded
  if (!userRole) return null;

  return (
    <div className="p-4 w-full flex flex-col gap-3 relative">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        {userRole !== "retailer" && (
          <h2 className="text-2xl font-bold text-gray-900">Products & Inventory</h2>
        )}

        {(userRole === "admin" || userRole === "branch_manager" || userRole === "retailer") && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              {userRole === "admin" ? (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3 py-2 border rounded bg-white shadow-sm"
                >
                  {branches.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              ) : userRole === "retailer" ? (
                <h2 className="text-lg text-gray-800">
                  Browse and purchase from nearby branches.
                </h2>
              ) : null}
            </div>

            <div className="flex gap-3 ml-auto">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
              >
                <Download className="w-5 h-5" /> Export Excel
              </button>

              {(userRole === "branch_manager" || userRole === "admin") && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
                >
                  <PlusCircle className="w-5 h-5" /> Add Product
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex gap-4 w-full h-[calc(100vh-180px)]">
        {/* PRODUCT TABLE */}
        <div className="flex-1 overflow-hidden">
          <div className="overflow-y-auto h-full">
            <ProductTable
              userRole={userRole}
              selectedBranch={selectedBranch}
              setProducts={setProducts}
              onRestock={handleRestockUpdate}
              borderless
              refreshTrigger={restockCounter}
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[380px] overflow-hidden">
          <div className="overflow-y-auto h-full">
            {userRole === "admin" ? (
              <AdminProducts refreshTrigger={restockCounter} borderless />
            ) : (
              <RestockHistory
                userRole={userRole}
                selectedBranch={selectedBranch}
                refreshTrigger={restockCounter}
                onHistoryFetched={setRestockHistory}
                borderless
              />
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showForm && <AddProductModal setShowForm={setShowForm} setProducts={setProducts} />}
    </div>
  );
}
