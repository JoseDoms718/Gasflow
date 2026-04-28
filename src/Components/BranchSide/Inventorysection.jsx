import React, { useState, useEffect } from "react";
import { PlusCircle, Download } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import ProductTable from "./ProductTable";
import AddProductModal from "./AddProductModal";
import RestockHistory from "./RestockHistory";
import AdminProducts from "../Modals/AdminProducts";
import AdminBundles from "../Modals/AdminBundles";
import AddBundleModal from "../Modals/AddBundleModal";
import AddBranchBundleModal from "../Modals/AddBranchBundleModal";

export default function Inventory() {
  const [userRole, setUserRole] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBundleForm, setShowBundleForm] = useState(false);

  const [selectedMunicipality, setSelectedMunicipality] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");

  const [restockCounter, setRestockCounter] = useState(0);

  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const token = localStorage.getItem("token");

  const municipalities = [
    "All",
    "Boac",
    "Mogpog",
    "Gasan",
    "Buenavista",
    "Torrijos",
    "Santa Cruz",
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUserRole(parsedUser.role);
    }
  }, []);

  const handleRestockUpdate = () =>
    setRestockCounter((prev) => prev + 1);

  const cleanNumber = (val) => {
    if (val === null || val === undefined) return 0;
    const num = Number(
      String(val)
        .replace(/\s/g, "")
        .replace(/[^\d.-]/g, "")
    );
    return isNaN(num) ? 0 : num;
  };

  const buildQuery = () => {
    const params = new URLSearchParams();

    if (selectedMunicipality !== "All") {
      params.append("municipality", selectedMunicipality);
    }

    return params.toString();
  };

  const handleExportPDF = async () => {
    try {
      if (!token) return toast.error("Unauthorized");

      let endpoint = "";

      if (userRole === "admin") {
        const query = buildQuery();
        endpoint = `${BASE_URL}/products/admin/all-products${query ? `?${query}` : ""}`;
      } else if (userRole === "branch_manager") {
        endpoint = `${BASE_URL}/products/my-products`;
      } else {
        return toast.error("You are not allowed to export this data.");
      }

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const products = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      if (!products.length) {
        return toast.error("No data to export.");
      }

      const doc = new jsPDF();

      const timestamp = new Date().toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      });

      doc.setFontSize(16);
      doc.text("Products & Inventory", 14, 15);

      doc.setFontSize(12);
      doc.text(`Role: ${userRole}`, 14, 22);
      doc.text(`Municipality: ${selectedMunicipality}`, 14, 28);
      doc.text(`Generated: ${timestamp}`, 14, 34);

      const tableData = products.map((p) => {
        const price = cleanNumber(
          p.branch_discounted_price ??
          p.branch_price ??
          p.price
        );

        return [
          p.product_name || "N/A",
          p.branch_name || "N/A",
          p.stock ?? 0,
          `PHP ${price.toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: 42,
        head: [["Product Name", "Branch", "Stock", "Price"]],
        body: tableData,
      });

      doc.save(`Inventory_${userRole}_${selectedMunicipality}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF.");
    }
  };

  if (!userRole) return null;

  return (
    <div className="p-4 w-full flex flex-col gap-3">

      {/* HEADER */}
      <div className="flex flex-col gap-3">

        <h2 className="text-2xl font-bold text-gray-900">
          Products & Inventory
        </h2>

        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          {/* FILTERS */}
          <div className="flex items-center gap-3">
            {userRole === "admin" && (
              <select
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="px-3 py-2 border rounded bg-white shadow-sm h-10"
              >
                {municipalities.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 items-center flex-wrap sm:ml-auto">

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 h-10 rounded shadow whitespace-nowrap"
            >
              <Download className="w-5 h-5" />
              Export PDF
            </button>

            {(userRole === "branch_manager" || userRole === "admin") && (
              <>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 rounded shadow whitespace-nowrap"
                >
                  <PlusCircle className="w-5 h-5" />
                  Add Product
                </button>

                <button
                  onClick={() => setShowBundleForm(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 h-10 rounded shadow whitespace-nowrap"
                >
                  <PlusCircle className="w-5 h-5" />
                  Add Bundle
                </button>
              </>
            )}

          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex gap-4 w-full h-[calc(100vh-180px)]">

        <div className="flex-1 overflow-hidden">
          <div className="overflow-y-auto h-full">
            <ProductTable
              userRole={userRole}
              selectedBranch={selectedBranch}
              selectedMunicipality={selectedMunicipality}
              onRestock={handleRestockUpdate}
              refreshTrigger={restockCounter}
            />
          </div>
        </div>

        <div className="w-[380px] h-full">
          <div className="overflow-y-auto h-full flex flex-col gap-4">

            {userRole === "admin" ? (
              <>
                <AdminProducts
                  refreshTrigger={restockCounter}
                  selectedMunicipality={selectedMunicipality}
                  borderless
                />

                <AdminBundles
                  refreshTrigger={restockCounter}
                  selectedMunicipality={selectedMunicipality}
                  borderless
                />
              </>
            ) : (
              <RestockHistory
                userRole={userRole}
                selectedMunicipality={selectedMunicipality}
                refreshTrigger={restockCounter}
                borderless
              />
            )}

          </div>
        </div>

      </div>

      {/* MODALS */}
      {showForm && <AddProductModal setShowForm={setShowForm} />}

      {showBundleForm && userRole === "branch_manager" && (
        <AddBranchBundleModal setShowBundleForm={setShowBundleForm} />
      )}

      {showBundleForm && userRole === "admin" && (
        <AddBundleModal setShowBundleForm={setShowBundleForm} />
      )}

    </div>
  );
}