import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle, Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

import ProductTable from "./ProductTable";
import AddProductModal from "./AddProductModal";
import EditProductModal from "./EditProductModal";
import RestockHistory from "./RestockHistory";

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [products, setProducts] = useState([]);
  const [restockHistory, setRestockHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [restockCounter, setRestockCounter] = useState(0);

  const branches = ["All", "Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setUserRole(parsedUser.role);
    }
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const endpoint =
          userRole === "admin"
            ? `http://localhost:5000/products/admin/all-products?branch=${selectedBranch}`
            : "http://localhost:5000/products/my-products";

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
  }, [user, userRole, selectedBranch, restockCounter]);

  const handleRestockUpdate = () => {
    setRestockCounter((prev) => prev + 1);
  };

  const handleExportExcel = () => {
    if (!products.length && !restockHistory.length)
      return toast.error("No data to export.");

    const timestamp = new Date();
    const formattedTimestamp = timestamp
      .toLocaleString("en-PH", { timeZone: "Asia/Manila" })
      .replace(/[/:,]/g, "-")
      .replace(/\s+/g, "_");

    const wb = XLSX.utils.book_new();

    const productData = products.map((p) => ({
      "Product Name": p.product_name || "N/A",
      "Price (₱)": p.price ? Number(p.price).toFixed(2) : "0.00",
      Stock: p.stock || 0,
      Branch: p.branch || "N/A",
    }));

    const ws1 = XLSX.utils.json_to_sheet(productData);
    XLSX.utils.book_append_sheet(wb, ws1, "Inventory");

    const historyData = restockHistory.map((h) => ({
      "Product Name": h.product_name,
      Quantity: h.quantity,
      "Previous Stock": h.previous_stock,
      "New Stock": h.new_stock,
      "Restocked By": h.restocked_by_name || h.restocked_by || "-",
      Date: new Date(h.restocked_at || h.date).toLocaleString("en-PH"),
    }));

    const ws2 = XLSX.utils.json_to_sheet(historyData);
    XLSX.utils.book_append_sheet(wb, ws2, "Restock History");

    const fileName = `Inventory_and_Restock_${selectedBranch}_${formattedTimestamp}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
  };

  return (
    <div className="p-4 w-full flex flex-col gap-3 relative">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        {userRole !== "retailer" && (
          <h2 className="text-2xl font-bold text-gray-900">Products & Inventory</h2>
        )}

        {(userRole === "admin" || userRole === "branch_manager" || userRole === "retailer") && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="flex-1 w-full">
              {userRole === "admin" ? (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 rounded bg-white border text-gray-900 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              ) : userRole === "retailer" ? (
                <h2 className="text-lg font-semibold text-gray-800 text-center sm:text-left">
                  Browse and purchase products from nearby branches.
                </h2>
              ) : null}
            </div>

            <div className="flex gap-3 ml-auto">
              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
              >
                <Download className="w-5 h-5" /> Export Excel
              </button>

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

      {/* MAIN CONTENT */}
      <div className="flex gap-4 w-full h-[calc(100vh-180px)]">
        {/* LEFT: PRODUCT TABLE */}
        <div className="flex-1 overflow-hidden">
          <div className="overflow-y-auto h-full">
            <ProductTable
              products={products}
              userRole={userRole}
              selectedBranch={selectedBranch}
              setSelectedProduct={setSelectedProduct}
              setProducts={setProducts}
              onRestock={handleRestockUpdate}
              borderless
            />
          </div>
        </div>

        {/* RIGHT: RESTOCK HISTORY */}
        <div className="w-[380px] overflow-hidden">
          <div className="overflow-y-auto h-full">
            <RestockHistory
              selectedBranch={selectedBranch}
              refreshTrigger={restockCounter}
              onHistoryFetched={setRestockHistory}
              borderless
            />
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showForm && <AddProductModal setShowForm={setShowForm} setProducts={setProducts} />}
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
