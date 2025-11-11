import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle } from "lucide-react";
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

  const branches = ["All", "Boac", "Mogpog", "Gasan", "Buenavista", "Torrijos", "Santa Cruz"];

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

        const res = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });

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

  return (
    <div className="p-4 w-full flex flex-col gap-2 relative">

      {/* ---------------- Header ---------------- */}
      {(userRole === "admin" || userRole === "branch_manager") ? (
        <>
          <div className="mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Products & Inventory</h2>
          </div>

          {/* Admin dropdown filter */}
          {userRole === "admin" && (
            <div className="mb-2">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 rounded bg-white border text-gray-900 shadow-sm hover:border-gray-400"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Branch Manager Add button (below title on right side) */}
          {userRole === "branch_manager" && (
            <div className="w-full flex justify-end mb-2">
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center gap-2 shadow-sm transition"
              >
                <PlusCircle size={20} /> Add Product
              </button>
            </div>
          )}
        </>
      ) : (
        /* Original UI for non-admins and non-branch managers */
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-800">
            Manage and monitor your current product inventory.
          </h2>

          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center gap-2 shadow-sm transition"
          >
            <PlusCircle size={20} /> Add Product
          </button>
        </div>
      )}

      {/* ---------------- Product Table ---------------- */}
      <ProductTable
        products={products}
        userRole={userRole}
        selectedBranch={selectedBranch}
        setSelectedProduct={setSelectedProduct}
        setProducts={setProducts}
      />

      {/* ---------------- Add / Edit Modals ---------------- */}
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
