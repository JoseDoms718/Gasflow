import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle, Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

import ProductTable from "./ProductTable";
import AddProductModal from "./AddProductModal";
import EditProductModal from "./EditProductModal";

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const branches = [
    "All",
    "Boac",
    "Mogpog",
    "Gasan",
    "Buenavista",
    "Torrijos",
    "Santa Cruz",
  ];

  /* ----------------------------- Load user info ----------------------------- */
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setUserRole(parsedUser.role);
    }
  }, []);

  /* ----------------------------- Fetch products ----------------------------- */
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        let endpoint = "";
        if (userRole === "admin") {
          endpoint = `http://localhost:5000/products/admin/all-products?branch=${selectedBranch}`;
        } else {
          endpoint = "http://localhost:5000/products/my-products";
        }

        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const formatted = res.data.map((p) => ({
          ...p,
          image_url: p.image_url
            ? p.image_url.startsWith("http")
              ? p.image_url
              : `http://localhost:5000/products/images/${p.image_url}`
            : null,
        }));

        setProducts(formatted);
      } catch (err) {
        console.error("❌ Failed to fetch products:", err);
      }
    };

    if (user && userRole) fetchProducts();
  }, [user, userRole, selectedBranch]);

  /* ----------------------------- Export to Excel ----------------------------- */
  const handleExportExcel = () => {
    if (!products.length) return toast.error("No product data to export.");

    const timestamp = new Date();
    const formattedTimestamp = timestamp
      .toLocaleString("en-PH", { timeZone: "Asia/Manila" })
      .replace(/[/:,]/g, "-")
      .replace(/\s+/g, "_");

    const data = products.map((p) => ({
      "Product Name": p.product_name || "N/A",
      "Price (₱)": p.price ? Number(p.price).toFixed(2) : "0.00",
      Stock: p.stock || 0,
      Branch: p.branch || "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet([]);

    // Add export timestamp on top
    XLSX.utils.sheet_add_aoa(
      ws,
      [["Exported on:", timestamp.toLocaleString("en-PH", { timeZone: "Asia/Manila" })]],
      { origin: "A1" }
    );
    XLSX.utils.sheet_add_aoa(ws, [[]], { origin: "A2" }); // blank line
    XLSX.utils.sheet_add_json(ws, data, { origin: "A3", skipHeader: false });

    // Auto column width
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length + 2, ...data.map((r) => String(r[key]).length + 2)),
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");

    const fileName = `Inventory_${selectedBranch === "All" ? "AllBranches" : selectedBranch
      }_${formattedTimestamp}.xlsx`;

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
  };

  return (
    <div className="p-4 w-full flex flex-col gap-3 relative">
      {/* ---------------- Header ---------------- */}
      <div className="flex flex-col gap-2">
        {/* Only show main title for non-retailers */}
        {userRole !== "retailer" && (
          <h2 className="text-2xl font-bold text-gray-900">Products & Inventory</h2>
        )}

        {/* Filter and Export Row */}
        {(userRole === "admin" ||
          userRole === "branch_manager" ||
          userRole === "retailer") && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              {/* Left side: Branch Filter for Admin, or Retailer Description */}
              {userRole === "admin" ? (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 rounded bg-white border text-gray-900 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : userRole === "retailer" ? (
                <h2 className="text-lg font-semibold text-gray-800 text-center sm:text-left">
                  Browse and purchase products from nearby branches.
                </h2>
              ) : (
                <div></div>
              )}

              {/* Right side: Buttons */}
              <div className="flex flex-wrap gap-3 justify-end w-full sm:w-auto">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
                >
                  <Download className="w-5 h-5" /> Export Excel
                </button>

                {/* Allow retailer and branch manager to add product */}
                {(userRole === "branch_manager" || userRole === "retailer") && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
                  >
                    <PlusCircle className="w-5 h-5" /> Add Product
                  </button>
                )}
              </div>
            </div>
          )}
      </div>

      {/* ---------------- Product Table ---------------- */}
      <ProductTable
        products={products}
        userRole={userRole}
        selectedBranch={selectedBranch}
        setSelectedProduct={setSelectedProduct}
        setProducts={setProducts}
      />

      {/* ---------------- Add / Edit Modals ---------------- */}
      {showForm && (
        <AddProductModal setShowForm={setShowForm} setProducts={setProducts} />
      )}
      {selectedProduct && (
        <EditProductModal
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          setProducts={setProducts}
        />
      )}
    </div>
  );
}
